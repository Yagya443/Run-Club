import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, errorMessage } from '../lib/api.js';
import { when } from '../lib/format.js';
import { cacheRun, listCachedRuns } from '../lib/offlineDb.js';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const Stat = ({ label, value }) => <div><p className="font-display text-3xl font-bold text-forest">{value}</p><p className="text-sm text-stone">{label}</p></div>;
const Row = ({ r }) => <Link to={`/runs/${r.id}`} className="panel block hover:border-forest"><p className="font-bold">{r.title}</p><p className="text-sm text-stone">{when(r.scheduledAt)}{r.distanceKm && ` · ${r.distanceKm} km`} · {r.runners} runners{r.area && ` · Near ${r.area}`}</p></Link>;

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [saved, setSaved] = useState([]);
  useEffect(() => {
    api.get('/dashboard').then((r) => { setData(r.data); const n = r.data.nextRun; if (n) api.get(`/runs/${n.id}`).then((x) => cacheRun(x.data.run)).catch(() => {}); }) // keep your next run available offline
      .catch(async (e) => { setError(errorMessage(e)); if (!e.response) setSaved((await listCachedRuns()).filter((r) => ['PLANNED', 'ACTIVE'].includes(r.status)).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))); });
  }, []);
  return (
    <div className="space-y-10">
      <section className="rounded-lg bg-forest p-6 text-white sm:p-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{greeting()}, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-lg text-white/80">Ready for a run?</p>
        <Link to="/plan" className="btn mt-5 bg-sun text-ink hover:bg-ember">Plan a run</Link>
      </section>
      {error && <p role="alert" className="panel">{error}</p>}
      {saved.length > 0 && <section><h2 className="mb-3 text-xl font-bold">Saved on this device</h2><div className="space-y-2">{saved.map((r) => <Link key={r.id} to={`/runs/${r.id}`} className="panel block hover:border-forest"><p className="font-bold">{r.title}</p><p className="text-sm text-stone">{when(r.scheduledAt)} · {r.distanceKm} km</p></Link>)}</div></section>}
      {!data && !error && <p className="text-stone">Loading…</p>}
      {data && (<>
        {data.activeRun && <Link to={`/runs/${data.activeRun.id}/active`} className="panel block !border-forest bg-sage-light"><p className="font-bold">Run in progress</p><p className="text-sm">{data.activeRun.title}. Tap to resume.</p></Link>}
        {data.invitations.length > 0 && <section><h2 className="mb-3 text-xl font-bold">Invitations</h2><div className="space-y-2">{data.invitations.map((r) => <Row key={r.id} r={r} />)}</div></section>}
        <section><h2 className="mb-3 text-xl font-bold">Your next run</h2>
          {data.nextRun ? <Link to={`/runs/${data.nextRun.id}`} className="panel block hover:border-forest"><p className="text-lg font-bold">{data.nextRun.title}</p>
            <p className="text-stone">{when(data.nextRun.scheduledAt)}{data.nextRun.distanceKm && ` · ${data.nextRun.distanceKm} km`}{data.nextRun.otherRunners > 0 && ` · ${data.nextRun.otherRunners} runners joining`}</p></Link>
            : <div className="panel flex items-center gap-3 text-stone"><CalendarClock size={20} className="text-forest" />Nothing planned yet. Your next run will show up here.</div>}</section>
        <section><div className="mb-3 flex items-baseline justify-between"><h2 className="text-xl font-bold">Nearby runs</h2><Link to="/discover" className="text-sm font-semibold text-forest underline">See all</Link></div>
          {data.nearbyRuns.length ? <div className="space-y-2">{data.nearbyRuns.map((r) => <Row key={r.id} r={r} />)}</div>
            : <div className="panel flex items-center gap-3 text-stone"><Compass size={20} className="text-forest" />No public group runs yet. Join a club to find or schedule one.</div>}</section>
        <section><h2 className="mb-3 text-xl font-bold">Your week</h2><div className="panel grid grid-cols-3 gap-4"><Stat label="km run" value={data.week.distanceKm} /><Stat label="runs" value={data.week.runs} /><Stat label="day streak" value={data.week.streak} /></div></section>
      </>)}
    </div>
  );
}
