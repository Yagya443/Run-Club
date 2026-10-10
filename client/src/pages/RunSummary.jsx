import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import RouteMap from '../components/RouteMap.jsx';
import { api, errorMessage } from '../lib/api.js';
import { when } from '../lib/format.js';
import { clock } from '../lib/tracker.js';

const Stat = ({ v, l }) => <div><p className="font-display text-3xl font-bold text-forest">{v}</p><p className="text-sm text-stone">{l}</p></div>;

export default function RunSummary() {
  const { id } = useParams();
  const [run, setRun] = useState(null); const [error, setError] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get(`/runs/${id}`).then((r) => setRun(r.data.run)).catch((e) => setError(errorMessage(e))), [id]);
  useEffect(() => { load(); }, [load]);
  async function send(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await api.post(`/runs/${id}/reflection`, { text }); await load(); }
    catch (err) { const f = err?.response?.data?.fields; setError(f ? Object.values(f).flat().join(' ') : errorMessage(err)); } finally { setBusy(false); }
  }
  if (error && !run) return <p role="alert" className="panel">{error}</p>;
  if (!run) return <p className="text-stone">Loading…</p>;
  if (!run.myResult) return <div className="panel">No result recorded for this run yet. <Link className="underline" to={`/runs/${id}`}>Back to the run</Link></div>;
  const r = run.myResult, ref = run.myReflection;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <header><h1 className="text-3xl font-bold">{run.title}</h1><p className="text-stone">{when(r.completedAt)}</p></header>
        <section className="panel grid grid-cols-3 gap-4"><Stat v={r.distanceKm} l="km" /><Stat v={clock(r.durationSec)} l="time" /><Stat v={clock(Math.round(r.durationSec / r.distanceKm))} l="min/km" /></section>
        <p className="text-xs text-stone">Distance saved from {r.source === 'GPS' ? 'your phone’s GPS' : 'the planned route'}. {run.participants.filter((p) => p.status === 'JOINED').length > 1 && `Ran with ${run.participants.filter((p) => p.status === 'JOINED' && p.name).map((p) => p.name).join(', ')}.`}</p>
        {run.geometry && <><RouteMap coords={run.geometry} /><p className="text-xs text-stone">The map shows the planned route. Your GPS track isn’t stored.</p></>}
      </div>
      <aside className="space-y-4">
        {ref ? (
          <div className="panel space-y-3">
            <h2 className="text-xl font-bold">Your reflection</h2>
            <p className="text-sm text-stone">“{ref.text}”</p>
            <p>{ref.summary}</p>
            {ref.careNote && <p className="rounded-lg bg-ember/10 p-2 text-sm">{ref.careNote}</p>}
            {ref.nextRun && <div className="rounded-lg bg-sage-light p-3"><p className="font-semibold">Next: an {ref.nextRun.kind} {ref.nextRun.distanceKm} km</p><p className="text-sm">{ref.nextRun.note}</p>
              <Link to={`/plan?distance=${ref.nextRun.distanceKm}`} className="btn-primary mt-2 !py-2">Plan it</Link></div>}
            <p className="text-xs text-stone">{ref.ai?.used ? `Written by local AI (${ref.ai.model}).` : ref.ai?.error}</p>
          </div>
        ) : (
          <form onSubmit={send} className="panel space-y-3">
            <label htmlFor="fb" className="text-xl font-bold">How did the run feel?</label>
            <textarea id="fb" className="field" rows="4" maxLength="1000" placeholder="Great run. The middle section was hard but I enjoyed the park." value={text} onChange={(e) => setText(e.target.value)} />
            {error && <p role="alert" className="text-sm">{error}</p>}
            <button className="btn-primary" disabled={busy}>{busy ? 'Thinking…' : 'Save reflection'}</button>
          </form>)}
        <Link to="/history" className="btn-ghost w-full">See all your runs</Link>
      </aside>
    </div>
  );
}
