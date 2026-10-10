import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RouteMap from '../components/RouteMap.jsx';
import { api, errorMessage } from '../lib/api.js';
import { acceptFix, cumulative, routeProgress, nextCheckpoint, clock } from '../lib/tracker.js';
import { cacheRun, getCachedRun, getOutbox, queue, removeRunOps } from '../lib/offlineDb.js';
import { flushOutbox } from '../lib/sync.js';

export default function ActiveRun() {
  const { id } = useParams(); const nav = useNavigate();
  const key = `rc_run_${id}`;
  const [run, setRun] = useState(null); const [startedAt, setStartedAt] = useState(null); const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now()); const [dist, setDist] = useState(0); const [pos, setPos] = useState(null); const [gps, setGps] = useState('waiting');
  const [finishing, setFinishing] = useState(false); const [busy, setBusy] = useState(false); const [offline, setOffline] = useState(false); const [saved, setSaved] = useState(false);
  const anchor = useRef(null); const distRef = useRef(0); const cum = useRef([]);

  useEffect(() => { // start (or resume) on the server; if offline, fall back to the copy saved on this device
    (async () => {
      let startMs; let r;
      try {
        const s = await api.post(`/runs/${id}/start`, {}); startMs = new Date(s.data.startedAt).getTime();
        r = (await api.get(`/runs/${id}`)).data.run; cacheRun(r);
      } catch (e) {
        if (e.response) return setError(errorMessage(e));
        r = await getCachedRun(id);
        if (!r) return setError('You’re offline and this run isn’t saved on this device. Open it once while online before heading out.');
        const pending = (await getOutbox()).find((o) => o.runId === id && o.type === 'start');
        startMs = pending ? new Date(pending.payload.startedAt).getTime() : Date.now();
        if (!pending) await queue({ type: 'start', runId: id, payload: { startedAt: new Date(startMs).toISOString() } });
        setOffline(true);
      }
      cum.current = r.geometry ? cumulative(r.geometry) : []; setStartedAt(startMs); setRun(r);
      try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved) { distRef.current = saved.distanceM; setDist(saved.distanceM); } } catch { /* ignore */ }
    })();
  }, [id, key]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { // keep the screen on while running (best effort; not all browsers allow it)
    let lock; navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.().catch(() => {}); };
  }, []);
  useEffect(() => {
    if (!navigator.geolocation) { setGps('unavailable'); return; }
    const w = navigator.geolocation.watchPosition((p) => {
      const fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp };
      setPos(fix); setGps(fix.acc > 35 ? 'weak' : 'ok');
      const r = acceptFix(anchor.current, fix);
      if (r.anchor) anchor.current = fix;
      if (r.add) { distRef.current += r.add; setDist(distRef.current); try { localStorage.setItem(key, JSON.stringify({ distanceM: Math.round(distRef.current) })); } catch { /* storage full */ } }
    }, () => setGps('denied'), { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(w);
  }, [key]);

  if (error) return <main className="mx-auto max-w-md p-6"><p role="alert" className="panel">{error}</p><Link to={`/runs/${id}`} className="btn-ghost mt-4">Back to run</Link></main>;
  if (!run || !startedAt) return <main className="p-8 text-stone">Starting…</main>;
  if (saved) return <main className="mx-auto max-w-md space-y-3 p-6"><h1 className="text-2xl font-bold">Run saved on this device</h1><p>It will upload automatically when you’re back online. You can write your reflection after it syncs.</p><Link to="/home" className="btn-primary">Back home</Link></main>;

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const plannedM = Math.round((run.distanceKm || 0) * 1000);
  const prog = pos && cum.current.length ? routeProgress(run.geometry, cum.current, [pos.lat, pos.lng]) : null;
  const along = prog && prog.offRouteM < 200 ? prog.alongM : null;
  const cp = along != null ? nextCheckpoint(along, prog.totalM) : null;
  const pct = along != null ? Math.min(100, Math.round((along / prog.totalM) * 100)) : Math.min(100, Math.round((dist / (plannedM || 1)) * 100));
  const gpsOk = dist >= 100;

  async function finish(source) {
    setBusy(true); setError('');
    const payload = { durationSec: elapsed, distanceM: source === 'GPS' ? Math.round(dist) : plannedM, source };
    const clear = () => { try { localStorage.removeItem(key); } catch { /* ignore */ } };
    try {
      if (offline) throw new Error('queued'); // started offline: the outbox sends "start" then "complete" in order
      await api.post(`/runs/${id}/complete`, payload); clear(); nav(`/runs/${id}/summary`, { replace: true });
    } catch (e) {
      if (e.response) { setError(errorMessage(e)); return setBusy(false); }
      await queue({ type: 'complete', runId: id, payload }); clear();
      if ((await flushOutbox()) === 0) nav(`/runs/${id}/summary`, { replace: true }); else setSaved(true);
    }
  }
  async function discard() {
    if (!window.confirm('Discard this run? Nothing will be saved.')) return;
    try { if (offline) await removeRunOps(id); else await api.post(`/runs/${id}/discard`); localStorage.removeItem(key); nav(`/runs/${id}`, { replace: true }); } catch (e) { setError(errorMessage(e)); }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <p className="text-center text-sm text-stone">{run.title}</p>
      <div className="text-center" aria-live="off"><p className="font-display text-7xl font-bold tabular-nums text-forest">{clock(elapsed)}</p><p className="text-stone">elapsed</p></div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="panel"><p className="font-display text-3xl font-bold">{(dist / 1000).toFixed(2)}</p><p className="text-sm text-stone">km (GPS)</p></div>
        <div className="panel"><p className="font-display text-3xl font-bold">{pct}%</p><p className="text-sm text-stone">of {run.distanceKm} km route</p></div>
      </div>
      <div className="h-2 overflow-hidden rounded bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><div className="h-full bg-forest" style={{ width: `${pct}%` }} /></div>
      <p className="text-center text-sm">{cp ? `Next: ${cp.label}, ${Math.round(cp.remainingM)} m` : prog ? 'You’re away from the planned route.' : gps === 'ok' || gps === 'weak' ? 'Locating you on the route…' : ''}</p>
      {gps !== 'ok' && <p role="status" className="rounded-lg bg-ember/10 p-2 text-center text-sm">{{ waiting: 'Waiting for GPS. Allow location access.', weak: 'GPS signal is weak. Distance may lag.', denied: 'Location is blocked, so distance can’t be tracked. You can finish with the planned distance.', unavailable: 'This browser can’t track location. You can finish with the planned distance.' }[gps]}</p>}
      <div className="min-h-[200px] flex-1 [&>div]:!h-full [&>div]:min-h-[200px]"><RouteMap coords={run.geometry} meeting={run.meetingPoint?.lat ? run.meetingPoint : null} me={pos} /></div>
      {offline && <p role="status" className="text-center text-xs text-stone">Offline: recording on this device. It will sync when you’re back online.</p>}
      <p className="text-center text-sm text-stone">You’ve got the route. Enjoy the run.</p>
      {finishing ? (
        <div className="panel space-y-2">
          <p className="font-semibold">Finish at {clock(elapsed)}. Which distance should we save?</p>
          {gpsOk && <button className="btn-primary w-full" disabled={busy} onClick={() => finish('GPS')}>GPS distance: {(dist / 1000).toFixed(2)} km</button>}
          <button className={`${gpsOk ? 'btn-ghost' : 'btn-primary'} w-full`} disabled={busy} onClick={() => finish('PLANNED')}>Planned route: {run.distanceKm} km</button>
          <button className="w-full text-sm text-stone underline" onClick={() => setFinishing(false)}>Keep running</button>
        </div>
      ) : (<div className="flex gap-2"><button className="btn-primary flex-1 !py-4 text-base" onClick={() => setFinishing(true)}>Finish run</button><button className="btn-ghost" onClick={discard}>Discard</button></div>)}
    </main>
  );
}
