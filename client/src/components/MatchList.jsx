const clock = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const LABELS = { proximity: 'Distance apart', time: 'Start time', distance: 'Run length', pace: 'Pace', level: 'Experience' };

export default function MatchList({ data, selected, setSelected, onPlan, busy }) {
  const { matches, ai } = data;
  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  if (!matches.length) return (
    <div className="panel space-y-3">
      <div>
        <h2 className="text-xl font-bold">No matching runners yet</h2>
        <p className="mt-1 text-sm text-stone">We checked existing Run Club accounts with availability for this date, time, distance, and area. Your availability is now listed, so other runners searching later may find you.</p>
      </div>
      <p className="text-sm text-stone">You can create an open group run now. Other Run Club users can discover it and join.</p>
      <button className="btn-primary" onClick={onPlan} disabled={busy}>{busy ? 'Planning…' : 'Plan an open run'}</button>
    </div>
  );
  return (
    <div className="panel space-y-4">
      <div>
        <h2 className="text-xl font-bold">Runners who fit</h2>
        <p className="text-sm text-stone">{ai.used ? `Explanations written by local AI (${ai.model}). Scores come from the factors listed under each runner.` : (ai.error || 'Basic explanations.') + ' Scores come from the factors listed under each runner.'}</p>
      </div>
      <ul className="divide-y divide-line">
        {matches.map((m) => (
          <li key={m.userId} className="py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1.5 h-5 w-5 accent-[#2E5B3F]" checked={selected.includes(m.userId)} onChange={() => toggle(m.userId)} />
              <span className="flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2"><strong>{m.firstName}</strong>{m.isDemo && <span className="rounded bg-sun/40 px-1.5 text-xs">Demo runner</span>}<span className="font-semibold text-forest">{m.band} · {m.score}%</span></span>
                <span className="block text-sm text-stone">{clock(m.time)} · {m.distanceKm} km · about {m.distanceKmApprox} km away{m.area ? ` · ${m.area}` : ''}</span>
                <span className="mt-1 block text-sm">{m.reason}</span>
                <details className="mt-1 text-sm text-stone" onClick={(e) => e.stopPropagation()}><summary className="cursor-pointer">How this score is built</summary><ul className="mt-1 grid grid-cols-2 gap-x-4">{Object.entries(m.factors).map(([k, v]) => <li key={k}>{LABELS[k]}: {v}%</li>)}</ul></details>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button className="btn-primary" onClick={onPlan} disabled={busy}>{busy ? 'Planning…' : selected.length ? `Plan a group run with ${selected.length}` : 'Plan an open run'}</button>
      {!selected.length && <p className="text-xs text-stone">An open run can be discovered and joined by other Run Club users.</p>}
    </div>
  );
}
