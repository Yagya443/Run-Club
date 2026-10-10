import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, LocateFixed } from "lucide-react";
import MatchList from "../components/MatchList.jsx";
import RouteMap from "../components/RouteMap.jsx";
import { api, errorMessage } from "../lib/api.js";

const DISTANCES = [2, 3, 5, 7, 10];
const ENV = [
    ["MIXED", "Mixed"],
    ["GREENERY", "Greenery"],
    ["PARKS", "Parks"],
    ["WATERFRONT", "Waterfront"],
    ["QUIET_ROADS", "Quiet roads"],
    ["LANDMARKS", "Landmarks"],
];
const TIMES = Array.from({ length: 33 }, (_, i) => {
    const m = 300 + i * 30,
        h = Math.floor(m / 60),
        mm = m % 60;
    return {
        v: `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        l: `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`,
    };
});
const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return ymd(d);
};

const Chip = ({ on, children, ...p }) => (
    <button
        type="button"
        aria-pressed={on}
        className={`rounded-lg border px-4 py-2 text-sm font-semibold ${on ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest"}`}
        {...p}
    >
        {children}
    </button>
);
const Group = ({ label, children }) => (
    <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{label}</legend>
        <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
);

export default function Plan() {
    const nav = useNavigate();
    const sp = useSearchParams()[0];
    const clubId = sp.get("club");
    const [title, setTitle] = useState("Club run");
    const [q, setQ] = useState("");
    const [hits, setHits] = useState([]);
    const [start, setStart] = useState(null);
    const [km, setKm] = useState(5);
    const [custom, setCustom] = useState(
        sp.get("distance") && Number(sp.get("distance")) >= 1
            ? sp.get("distance")
            : "",
    );
    const [routeType, setRouteType] = useState("LOOP");
    const [env, setEnv] = useState("MIXED");
    const [difficulty, setDifficulty] = useState("EASY");
    const [dateMode, setDateMode] = useState("tomorrow");
    const [customDate, setCustomDate] = useState(day(2));
    const [time, setTime] = useState("06:30");
    const [cands, setCands] = useState(null);
    const [pick, setPick] = useState(0);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [company, setCompany] = useState("SOLO");
    const [level, setLevel] = useState("BEGINNER");
    const [pace, setPace] = useState(420);
    const [matches, setMatches] = useState(null);
    const [selected, setSelected] = useState([]);
    const [plan, setPlan] = useState(null);

    const date =
        dateMode === "today"
            ? day(0)
            : dateMode === "tomorrow"
              ? day(1)
              : customDate;
    const scheduledAt = new Date(`${date}T${time}:00`);
    const setPoint = (lat, lng, label = "Dropped pin") => {
        setStart({ lat, lng, label });
        setCands(null);
        setMatches(null);
        setPlan(null);
        setHits([]);
    };

    async function search(e) {
        e.preventDefault();
        setError("");
        try {
            const { data } = await api.get("/geocode", { params: { q } });
            setHits(data.results);
            if (!data.results.length)
                setError(
                    "No places found. Try a more specific address or drop a pin.",
                );
        } catch (err) {
            setError(errorMessage(err));
        }
    }
    function locate() {
        if (!navigator.geolocation)
            return setError(
                "Your browser can’t share location. Search or drop a pin instead.",
            );
        navigator.geolocation.getCurrentPosition(
            (p) =>
                setPoint(p.coords.latitude, p.coords.longitude, "My location"),
            () =>
                setError(
                    "Location permission was denied. Search or drop a pin instead.",
                ),
        );
    }
    async function generate() {
        setError("");
        if (!start) return setError("Choose a start point first.");
        const distanceKm = custom ? Number(custom) : km;
        if (!(distanceKm >= 1 && distanceKm <= 42))
            return setError("Enter a distance between 1 and 42 km.");
        setBusy("generate");
        try {
            const { data } = await api.post("/routes/generate", {
                start: { lat: start.lat, lng: start.lng },
                distanceKm,
                routeType,
                environment: env,
                difficulty,
            });
            setCands(data.candidates);
            setPick(0);
        } catch (err) {
            setCands(null);
            setError(errorMessage(err));
        } finally {
            setBusy("");
        }
    }
    async function save() {
        setError("");
        setBusy("save");
        try {
            await api.post("/routes/save", {
                start,
                routeType,
                difficulty,
                geometry: cands[pick].coords,
                scheduledAt: scheduledAt.toISOString(),
            });
            nav("/home");
        } catch (err) {
            const f = err?.response?.data?.fields;
            setError(f ? Object.values(f).flat().join(" ") : errorMessage(err));
        } finally {
            setBusy("");
        }
    }
    async function saveClub() {
        setError("");
        setBusy("save");
        const [mLat, mLng] = cands[pick].coords[0];
        try {
            await api.post("/runs/create", {
                date,
                title,
                scheduledAt: scheduledAt.toISOString(),
                routeType,
                difficulty,
                meetingPoint: { label: start.label, lat: mLat, lng: mLng },
                geometry: cands[pick].coords,
                runners: [],
                clubId,
            });
            nav(`/clubs/${clubId}`);
        } catch (err) {
            const f = err?.response?.data?.fields;
            setError(f ? Object.values(f).flat().join(" ") : errorMessage(err));
        } finally {
            setBusy("");
        }
    }
    const distanceKm = custom ? Number(custom) : km;
    const base = () => ({
        date,
        time,
        distanceKm,
        routeType,
        difficulty,
    });
    async function findRunners() {
        setError("");
        if (!start) return setError("Choose a start point first.");
        if (!(distanceKm >= 1 && distanceKm <= 42))
            return setError("Enter a distance between 1 and 42 km.");
        setBusy("match");
        setPlan(null);
        try {
            const { data } = await api.post("/runners/match", {
                start,
                date,
                time,
                distanceKm,
                level,
                paceSecPerKm: pace,
            });
            setMatches(data);
            setSelected(
                data.matches
                    .filter((m) => m.score >= 60)
                    .slice(0, 3)
                    .map((m) => m.userId),
            );
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy("");
        }
    }
    async function planGroup() {
        setError("");
        setBusy("plan");
        try {
            const { data } = await api.post("/runs/plan", {
                ...base(),
                start,
                environment: env,
                runnerIds: selected,
            });
            setPlan(data);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy("");
        }
    }
    async function createGroup() {
        setError("");
        setBusy("create");
        try {
            const runners = matches.matches
                .filter((m) => selected.includes(m.userId))
                .map((m) => ({
                    userId: m.userId,
                    score: m.score,
                    reason: m.reason,
                }));
            await api.post("/runs/create", {
                date,
                title: plan.title,
                description: plan.description,
                scheduledAt: scheduledAt.toISOString(),
                routeType,
                difficulty,
                meetingPoint: plan.meetingPoint,
                geometry: plan.route.coords,
                runners,
                visibility: selected.length ? "PRIVATE" : "PUBLIC",
            });
            nav("/home");
        } catch (err) {
            const f = err?.response?.data?.fields;
            setError(f ? Object.values(f).flat().join(" ") : errorMessage(err));
        } finally {
            setBusy("");
        }
    }
    const chosen = cands?.[pick];

    return (
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">
                    {clubId ? "Plan a club run" : "Plan a run"}
                </h1>
                {clubId && (
                    <>
                        <label className="block text-sm font-semibold">
                            Run title
                            <input
                                className="field mt-1"
                                maxLength="80"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </label>
                        <p className="text-sm text-stone">
                            Pick a public meeting spot, not your home. Everyone
                            sees the area; only runners who join see the exact
                            spot.
                        </p>
                    </>
                )}
                <form onSubmit={search} className="space-y-2">
                    <label htmlFor="q" className="text-sm font-semibold">
                        Start and finish
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="q"
                            className="field"
                            placeholder="Search an address or place"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <button className="btn-ghost !px-3" aria-label="Search">
                            <Search size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={locate}
                            className="btn-ghost !px-3"
                            aria-label="Use my location"
                        >
                            <LocateFixed size={18} />
                        </button>
                    </div>
                    {hits.length > 0 && (
                        <ul className="panel !p-1 text-sm">
                            {hits.map((h) => (
                                <li key={`${h.lat}${h.lng}`}>
                                    <button
                                        type="button"
                                        className="w-full rounded p-2 text-left hover:bg-sage-light"
                                        onClick={() => {
                                            setPoint(
                                                h.lat,
                                                h.lng,
                                                h.label
                                                    .split(",")
                                                    .slice(0, 2)
                                                    .join(","),
                                            );
                                            setQ("");
                                        }}
                                    >
                                        {h.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-stone">
                        {start
                            ? `Starting from: ${start.label}`
                            : "Or click the map to drop a pin."}
                    </p>
                </form>

                <Group label="Distance">
                    {DISTANCES.map((d) => (
                        <Chip
                            key={d}
                            on={!custom && km === d}
                            onClick={() => {
                                setKm(d);
                                setCustom("");
                                setCands(null);
                            }}
                        >
                            {d} km
                        </Chip>
                    ))}
                    <input
                        aria-label="Custom distance in km"
                        className="field !w-28"
                        inputMode="decimal"
                        placeholder="Custom km"
                        value={custom}
                        onChange={(e) => {
                            setCustom(e.target.value);
                            setCands(null);
                        }}
                    />
                </Group>
                <Group label="When">
                    {[
                        ["today", "Today"],
                        ["tomorrow", "Tomorrow"],
                        ["custom", "Pick a date"],
                    ].map(([v, l]) => (
                        <Chip
                            key={v}
                            on={dateMode === v}
                            onClick={() => setDateMode(v)}
                        >
                            {l}
                        </Chip>
                    ))}
                    {dateMode === "custom" && (
                        <input
                            type="date"
                            aria-label="Run date"
                            className="field !w-auto"
                            min={day(0)}
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                        />
                    )}
                    <select
                        aria-label="Start time"
                        className="field !w-auto"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    >
                        {TIMES.map((t) => (
                            <option key={t.v} value={t.v}>
                                {t.l}
                            </option>
                        ))}
                    </select>
                </Group>
                {!clubId && (
                    <Group label="Run with someone?">
                        <Chip
                            on={company === "SOLO"}
                            onClick={() => {
                                setCompany("SOLO");
                                setMatches(null);
                                setPlan(null);
                            }}
                        >
                            Solo
                        </Chip>
                        <Chip
                            on={company === "GROUP"}
                            onClick={() => {
                                setCompany("GROUP");
                                setCands(null);
                            }}
                        >
                            Find runners
                        </Chip>
                    </Group>
                )}
                {company === "GROUP" && (
                    <>
                        <Group label="Your level">
                            {[
                                ["BEGINNER", "Beginner"],
                                ["INTERMEDIATE", "Intermediate"],
                                ["ADVANCED", "Advanced"],
                            ].map(([v, l]) => (
                                <Chip
                                    key={v}
                                    on={level === v}
                                    onClick={() => setLevel(v)}
                                >
                                    {l}
                                </Chip>
                            ))}
                        </Group>
                        <Group label="Your usual pace">
                            {[
                                [420, "Easy · 7:00/km"],
                                [360, "Steady · 6:00/km"],
                                [300, "Brisk · 5:00/km"],
                                [270, "Fast · 4:30/km"],
                            ].map(([v, l]) => (
                                <Chip
                                    key={v}
                                    on={pace === v}
                                    onClick={() => setPace(v)}
                                >
                                    {l}
                                </Chip>
                            ))}
                        </Group>
                        <p className="text-xs text-stone">
                            Finding runners lists you as available at this time
                            and area. Others see only your first name and an
                            approximate distance, never your address.
                        </p>
                    </>
                )}
                <Group label="Route type">
                    <Chip
                        on={routeType === "LOOP"}
                        onClick={() => {
                            setRouteType("LOOP");
                            setCands(null);
                        }}
                    >
                        Loop
                    </Chip>
                    <Chip
                        on={routeType === "OUT_AND_BACK"}
                        onClick={() => {
                            setRouteType("OUT_AND_BACK");
                            setCands(null);
                        }}
                    >
                        Out and back
                    </Chip>
                    <button
                        type="button"
                        disabled
                        className="rounded-lg border border-line px-4 py-2 text-sm text-stone/60"
                        title="Needs a destination picker: coming later"
                    >
                        Point to point
                    </button>
                </Group>
                <Group label="Environment">
                    {ENV.map(([v, l]) => (
                        <Chip key={v} on={env === v} onClick={() => setEnv(v)}>
                            {l}
                        </Chip>
                    ))}
                </Group>
                <Group label="Difficulty">
                    {["EASY", "MODERATE", "CHALLENGING"].map((v) => (
                        <Chip
                            key={v}
                            on={difficulty === v}
                            onClick={() => setDifficulty(v)}
                        >
                            {v[0] + v.slice(1).toLowerCase()}
                        </Chip>
                    ))}
                </Group>
                <p className="text-xs text-stone">
                    Environment and difficulty are saved with your run. They
                    don’t shape the route yet; that needs land-use data we
                    haven’t added.
                </p>
                {error && (
                    <p
                        role="alert"
                        className="rounded-lg bg-ember/10 p-3 text-sm"
                    >
                        {error}
                    </p>
                )}
                {company === "SOLO" ? (
                    <button
                        className="btn-primary w-full"
                        onClick={generate}
                        disabled={busy === "generate"}
                    >
                        {busy === "generate"
                            ? "Finding routes…"
                            : "Create my route"}
                    </button>
                ) : (
                    <button
                        className="btn-primary w-full"
                        onClick={findRunners}
                        disabled={busy === "match"}
                    >
                        {busy === "match"
                            ? "Looking for runners…"
                            : "Find runners"}
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <RouteMap
                    start={start}
                    meeting={plan?.meetingPoint}
                    coords={plan ? plan.route.coords : chosen?.coords}
                    onPick={(la, ln) => setPoint(la, ln)}
                />
                {company === "GROUP" && matches && !plan && (
                    <MatchList
                        data={matches}
                        selected={selected}
                        setSelected={setSelected}
                        onPlan={planGroup}
                        busy={busy === "plan"}
                    />
                )}
                {company === "GROUP" && plan && (
                    <div className="panel space-y-3">
                        <p className="font-display text-2xl font-bold">
                            {plan.title}
                        </p>
                        <p className="text-stone">
                            {scheduledAt.toLocaleString([], {
                                weekday: "long",
                                hour: "numeric",
                                minute: "2-digit",
                            })}{" "}
                            · {plan.route.distanceKm} km ·{" "}
                            {difficulty[0] + difficulty.slice(1).toLowerCase()}
                        </p>
                        <p>{plan.description}</p>
                        <p>
                            <strong>Meet at:</strong> {plan.meetingPoint.label}
                        </p>
                        <p>
                            <strong>Runners:</strong> You
                            {plan.participants
                                .map((p) => ` + ${p.firstName}`)
                                .join("")}
                        </p>
                        <p className="text-sm text-stone">
                            {plan.ai.used
                                ? `Route chosen and described by local AI (${plan.ai.model}): ${plan.reason}`
                                : plan.ai.error}
                        </p>
                        <p className="text-xs text-stone">
                            {selected.length
                                ? "Selected runners are invited. They can accept the invitation to join."
                                : "This is an open run. Other Run Club users can find it in Discover and join."}
                        </p>
                        <div className="flex gap-2">
                            <button
                                className="btn-primary"
                                onClick={createGroup}
                                disabled={busy === "create"}
                            >
                                {busy === "create"
                                    ? "Saving…"
                                    : "Create group run"}
                            </button>
                            <button
                                className="btn-ghost"
                                onClick={() => setPlan(null)}
                            >
                                Back to matches
                            </button>
                        </div>
                    </div>
                )}
                {company === "SOLO" && chosen && (
                    <div className="panel space-y-4">
                        <div>
                            <p className="font-display text-3xl font-bold text-forest">
                                {chosen.distanceKm} km{" "}
                                {routeType === "LOOP" ? "loop" : "out and back"}
                            </p>
                            <p className="text-stone">
                                {scheduledAt.toLocaleString([], {
                                    weekday: "long",
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}{" "}
                                ·{" "}
                                {difficulty[0] +
                                    difficulty.slice(1).toLowerCase()}
                            </p>
                            <p className="mt-1 text-sm text-stone">
                                {Math.abs(
                                    chosen.distanceKm - (custom || km),
                                ).toFixed(2)}{" "}
                                km from your target ·{" "}
                                {chosen.backtrack < 0.1
                                    ? "little doubling back"
                                    : "some doubling back"}
                            </p>
                        </div>
                        {cands.length > 1 && (
                            <Group label="Other options">
                                {cands.map((c, i) => (
                                    <Chip
                                        key={i}
                                        on={i === pick}
                                        onClick={() => setPick(i)}
                                    >
                                        {c.distanceKm} km
                                    </Chip>
                                ))}
                            </Group>
                        )}
                        <button
                            className="btn-primary"
                            onClick={clubId ? saveClub : save}
                            disabled={busy === "save"}
                        >
                            {busy === "save"
                                ? "Saving…"
                                : clubId
                                  ? "Create club run"
                                  : "Save this run"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
