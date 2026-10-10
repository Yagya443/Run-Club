import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import { when } from '../lib/format.js';
import { clock } from '../lib/tracker.js';

const Stat = ({ v, l }) => <div className="panel"><p className="font-display text-3xl font-bold text-forest">{v}</p><p className="text-sm text-stone">{l}</p></div>;
function Bars({ title, data }) {
  const max = Math.max(1, ...data.map((d) => d.km));
  return (
    <section className="panel"><h2 className="mb-3 font-bold">{title}</h2>
      <ul className="flex h-32 items-end gap-2">{data.map((d) => (
        <li key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1" aria-label={`${d.label}: ${d.km} km`}>
          <span className="text-xs text-stone">{d.km || ''}</span><span className="w-full rounded-t bg-forest" style={{ height: `${Math.max(2, (d.km / max) * 80)}px`, opacity: d.km ? 1 : 0.2 }} /><span className="text-xs text-stone">{d.label}</span></li>))}</ul>
    </section>);
}

export default function History() {
  const [s, setS] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get('/stats').then((r) => setS(r.data)).catch((e) => setError(errorMessage(e))); }, []);
  if (error) return <p role="alert" className="panel">{error}</p>;
  if (!s) return <p className="text-stone">Loading…</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Your runs</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat v={s.weekKm} l="km this week" /><Stat v={s.monthKm} l="km this month" /><Stat v={s.streak} l="day streak" /><Stat v={s.longestKm} l="km longest run" /></div>
      <div className="grid gap-4 md:grid-cols-2"><Bars title="Weekly distance (km)" data={s.weeks} /><Bars title="Monthly distance (km)" data={s.months} /></div>
      <section><h2 className="mb-3 text-xl font-bold">History · {s.totalRuns} runs · {s.totalKm} km</h2>
        {s.runs.length === 0 ? <div className="panel text-stone">No completed runs yet. Plan one, start it, and it will show up here.</div>
          : <ul className="space-y-2">{s.runs.map((r) => <li key={r.runId}><Link to={`/runs/${r.runId}/summary`} className="panel block !py-3 hover:border-forest"><span className="font-semibold">{r.title}</span> <span className="text-stone">· {when(r.completedAt)} · {r.distanceKm} km · {clock(r.durationSec)}</span></Link></li>)}</ul>}</section>
    </div>
  );
}
