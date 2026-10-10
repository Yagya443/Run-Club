import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed } from 'lucide-react';
import RunCard from '../components/RunCard.jsx';
import { api, errorMessage } from '../lib/api.js';

export default function Discover() {
  const nav = useNavigate();
  const [runs, setRuns] = useState(null); const [error, setError] = useState(''); const [near, setNear] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback((p) => api.get('/runs/discover', { params: p }).then((r) => setRuns(r.data.runs)).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { load(near); }, [near, load]);
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setNear({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setError('Location permission was denied. Showing all upcoming runs.')) ?? setError('Your browser can’t share location.');
  async function join(id) { setBusy(true); try { await api.post(`/runs/${id}/join`); nav(`/runs/${id}`); } catch (e) { setError(errorMessage(e)); setBusy(false); } }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Nearby runs</h1>
        <button className="btn-ghost" onClick={locate}><LocateFixed size={16} />{near ? 'Showing runs within 25 km' : 'Sort by my location'}</button>
      </div>
      {error && <p role="alert" className="panel">{error}</p>}
      {!runs && !error && <p className="text-stone">Loading…</p>}
      {runs?.length === 0 && <div className="panel text-stone">No public runs {near ? 'near you ' : ''}yet. Join a club and schedule one, and it will show up here.</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{runs?.map((r) => <RunCard key={r.id} run={r} onJoin={join} busy={busy} />)}</div>
      <p className="text-xs text-stone">Public runs show the area and a route preview. The exact meeting spot is revealed once you join.</p>
    </div>
  );
}
