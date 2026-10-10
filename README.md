# Run Club

**Plan less. Run more.** Tell Run Club where you want to start, how far, and when. It builds a loop on real roads and, if you want company, finds nearby runners for the same hour and picks a meeting point.

Open technology throughout: React, Express, MongoDB, OpenStreetMap, Leaflet, OSRM-compatible routing, and a local Qwen model through Ollama.

## What it does

- **Automatic loop routes.** Pick a start, distance, date and time. The server generates candidate loops (or out-and-backs) through the routing engine, rejects any more than 10% off your distance, scores the rest and shows the best three.
- **Run with someone.** Compatible runners are found by distance apart, start time, run length, pace and experience. Every score shows its breakdown. A local model writes the one-line explanation.
- **Group runs.** A meeting point is computed from everyone's start, snapped to the road network, and a route is generated from it. Other runners are invited and join when they accept.
- **Clubs and social.** Clubs, public group runs, Discover, profiles, follow, kudos, comments, sharing.
- **Active run.** Time, GPS distance, route progress and next checkpoint on one calm screen. Works offline.
- **History and reflection.** Weekly and monthly distance, streaks, and a short AI reflection with a next-run suggestion.

## Setup

Prerequisites: Node 20.6+, a running MongoDB 6+ server (local or Atlas), and [Ollama](https://ollama.com) (optional but recommended).

```bash
cp server/.env.example server/.env        # set DATABASE_URL, JWT_SECRET (openssl rand -hex 32), NOMINATIM_CONTACT
ollama pull qwen3:4b                      # optional: local AI

npm install                                # installs client and server dependencies, including Mongoose
npm run db:connect                         # verify MongoDB is reachable
npm run db:seed                            # optional demo data, see below
npm run dev                                # terminal 1: frontend, http://localhost:5173
cd server; npm run dev                     # terminal 2: backend, http://localhost:4000
npm test                                  # offline tests + client build
```

Mongoose is the backend's MongoDB library and is already listed as a server dependency. `npm install mongoose` by itself does not install or start the MongoDB database server. Set `DATABASE_URL` in `server/.env` to your local MongoDB URL or Atlas connection string.

Existing records are not copied automatically. Export and migrate any data you need before using the MongoDB database.

### Environment (server/.env)

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `JWT_SECRET` | Required. MongoDB connection string and JWT secret; secret must be 32+ characters in production. |
| `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS` | Local AI. Model defaults to `qwen3:4b`. Any Ollama model that follows JSON instructions works. |
| `ROUTING_BASE_URL`, `ROUTING_PROFILE` | OSRM-compatible router. Defaults to the public FOSSGIS foot server. Self-host OSRM for real use. |
| `NOMINATIM_URL`, `NOMINATIM_CONTACT` | Address search. Nominatim's policy requires a contact in the User-Agent. |
| `SEED_LAT`, `SEED_LNG` | Where demo runners are placed. Set these near where you will test. |
| `TRUST_PROXY` | Set to 1 behind a reverse proxy so rate limiting sees real client IPs. |

## Demo data

`npm run db:seed` creates:

- `yagna@example.com` / `password123`
- Five **demo runners** (Rahul, Priya, Aman, Neha, Karan) near `SEED_LAT/SEED_LNG`, available for the next three days. They are labelled "Demo runner" in the UI and their accounts cannot be logged into.
- A demo club, "Sunday Morning Runners", and a public run, "Sunday Sunrise 5K", with a **real route from the routing service**. If the router is unreachable the run is skipped rather than faked.

Nothing else is simulated: no stats, history or AI text is invented. Re-run the seed any time to refresh dates.

## Why Open AI?

**Local inference.** The AI runs on your machine through Ollama and Qwen. The browser never talks to it; only the Express server does.

**Privacy.** Running habits, locations and written reflections don't have to be sent to a proprietary AI provider. The prompts contain computed facts, not addresses.

**Cost.** No per-request charges for the AI features.

**Model flexibility.** Change `OLLAMA_MODEL` to use another Ollama-compatible model. Nothing is hard-coded to Qwen.

**Offline potential.** Local inference can work without cloud AI infrastructure. (The app's matching and reflections need your server and Ollama, not the internet.)

**Open ecosystem.** Open-weight AI sits beside OpenStreetMap, Leaflet, OSRM and Nominatim. The open pieces are the product, not decoration.

### Where AI is used, and where it is not

| Code decides (deterministic) | AI helps (Qwen) |
|---|---|
| Distance, route geometry, ETA, coordinates (routing engine + haversine) | Choosing among valid route candidates |
| Who is nearby and available (database + code filters) | One-line explanations of runner matches |
| Match **scores** (weighted factors, shown in the UI) | Run titles and descriptions |
| Safety limits on suggestions (next run is clamped to -50%/+25% distance) | Post-run reflection and next-run idea |

Every AI call asks for JSON, validates it with a schema, and falls back to a deterministic result if the model is down or returns something unusable. The UI always says which one you are seeing.

## Privacy model

- Exact home locations are never sent to other users. Runners see a first name and a distance **rounded up to the next 0.5 km**.
- Runs that start at someone's home cannot be made public.
- Public runs show the area and a route preview with the first and last 300 m removed. The exact meeting spot appears only after you join.
- Private runs return "not found" to non-participants.
- GPS tracks are not stored, only distance, time and the source of the distance.
- Saved runs on your device are removed when you sign out.

## Offline

Works offline once the app has been opened online and reloaded once: the app shell, your saved runs and routes (IndexedDB), map tiles you have already viewed, and recording a run with GPS. A run recorded offline is queued and sent when you reconnect.

Needs a connection: planning, runner matching, Discover, joining, comments, kudos and reflections. The app says so when you are offline. Web fonts fall back to system fonts offline.

## API

All routes are under `/api` and need a Bearer token except `/health` and `/auth/*`.

`POST /routes/generate` · `/routes/save` · `GET /geocode` · `GET /runners/nearby` · `POST /runners/match` · `POST /runs/plan` · `POST /runs/create` · `GET /runs/discover` · `GET /runs/:id` · `POST /runs/:id/{join,leave,start,complete,discard,reflection,kudos,comments}` · `PUT /runs/:id/visibility` · `GET|POST /clubs`, `GET /clubs/:id`, `POST /clubs/:id/{join,leave}` · `GET /users/:id`, `PUT /me/profile`, `POST|DELETE /users/:id/follow` · `GET /stats` · `GET /ai/status`

## Known limitations

- Environment and difficulty preferences are saved but do not yet shape routes (needs OSM land-use data via Overpass). Point-to-point routes need a destination picker.
- Browser GPS is less reliable than a watch: locked screens and background tabs can pause tracking, especially on iOS.
- Joining a group run is invite/accept only; there is no notification system yet.
- No profile photo upload, leaderboards, password reset or email verification.
- The auth token is stored in localStorage. React escapes output and the API sends strict headers, but a cookie-based session with CSRF protection is the next hardening step for production.
- The public routing and Nominatim servers are shared and rate limited. Self-host for real use.
- Weekly stats use the server's time zone.

See `docs/ARCHITECTURE.md` for how the pieces fit together.
