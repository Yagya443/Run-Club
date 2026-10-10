import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Share2 } from 'lucide-react';
import RouteMap from '../components/RouteMap.jsx';
import { api, errorMessage } from '../lib/api.js';
import { cacheRun, getCachedRun } from '../lib/offlineDb.js';
import { when, cap } from '../lib/format.js';

export default function RunDetail() {
  const { id } = useParams();
  const [offlineCopy, setOfflineCopy] = useState(false); const [run, setRun] = useState(null); const [error, setError] = useState(''); const [note, setNote] = useState(''); const [text, setText] = useState('');
  const load = useCallback(() => api.get(`/runs/${id}`).then((r) => { setRun(r.data.run); setOfflineCopy(false); if (['HOST', 'JOINED'].includes(r.data.run.myStatus)) cacheRun(r.data.run); })
    .catch(async (e) => { if (!e.response) { const c = await getCachedRun(id); if (c) { setRun(c); setOfflineCopy(true); return; } } setError(errorMessage(e)); }), [id]);
  useEffect(() => { load(); }, [load]);
  const act = (fn) => async () => { setError(''); try { await fn(); await load(); } catch (e) { setError(errorMessage(e)); } };

  async function share() {
    const url = `${window.location.origin}/runs/${id}`;
    try { if (navigator.share) await navigator.share({ title: run.title, url }); else { await navigator.clipboard.writeText(url); setNote('Link copied.'); } } catch { /* cancelled */ }
  }
  if (error && !run) return <p role="alert" className="panel">{error}</p>;
  if (!run) return <p className="text-stone">Loading…</p>;
  const joined = run.myStatus === 'HOST' || run.myStatus === 'JOINED';
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <header>
          <h1 className="text-3xl font-bold">{run.title}</h1>
          <p className="text-stone">{when(run.scheduledAt)} · {run.distanceKm} km · {cap(run.difficulty)} · {run.routeType === 'LOOP' ? 'Loop' : 'Out and back'}</p>
          {run.club && <p className="text-sm text-stone">Club: <Link className="underline" to={`/clubs/${run.club.id}`}>{run.club.name}</Link></p>}
        </header>
        {offlineCopy && <p role="status" className="rounded-lg bg-sun/30 p-2 text-sm">Offline: showing the copy saved on this device. Joining, comments and kudos need a connection.</p>}
        {run.geometry && <RouteMap coords={run.geometry} meeting={joined ? run.meetingPoint : null} />}
        {!joined && run.meetingPoint && <p className="text-sm text-stone">Route preview with the start and finish area hidden. Join to see the exact meeting spot.</p>}
        {run.description && <p>{run.description}</p>}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Comments</h2>
          {run.comments.length === 0 && <p className="text-stone">No comments yet.</p>}
          <ul className="space-y-2">{run.comments.map((c) => (
            <li key={c.id} className="panel !py-3"><p className="text-sm"><Link className="font-semibold hover:underline" to={`/u/${c.user.id}`}>{c.user.name}</Link> <span className="text-stone">· {when(c.createdAt)}</span></p><p>{c.body}</p>
              {c.mine && <button className="text-sm text-stone underline" onClick={act(() => api.delete(`/runs/${id}/comments/${c.id}`))}>Delete</button>}</li>))}</ul>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) act(async () => { await api.post(`/runs/${id}/comments`, { body: text }); setText(''); })(); }}>
            <input className="field" aria-label="Add a comment" placeholder="Add a comment" maxLength="500" value={text} onChange={(e) => setText(e.target.value)} /><button className="btn-primary">Post</button></form>
        </section>
      </div>
      <aside className="space-y-4">
        <div className="panel space-y-3">
          {run.meetingPoint && <p><strong>Meet at:</strong> {run.meetingPoint.label}</p>}
          <p><strong>Hosted by:</strong> <Link className="underline" to={`/u/${run.host.id}`}>{run.host.name}</Link></p>
          <div className="flex flex-wrap gap-2">
            {run.canStart && <Link to={`/runs/${id}/active`} className="btn-primary">{run.inProgress ? 'Resume run' : 'Start run'}</Link>}
            {run.myResult && <Link to={`/runs/${id}/summary`} className="btn-primary">View your result</Link>}
            {run.myStatus === 'INVITED' && <button className="btn-primary" onClick={act(() => api.post(`/runs/${id}/join`))}>Accept invitation</button>}
            {!run.myStatus && <button className="btn-primary" onClick={act(() => api.post(`/runs/${id}/join`))}>Join run</button>}
            {run.myStatus === 'JOINED' && <button className="btn-ghost" onClick={act(() => api.post(`/runs/${id}/leave`))}>Leave run</button>}
            {run.myStatus === 'INVITED' && <button className="btn-ghost" onClick={act(() => api.post(`/runs/${id}/leave`))}>Decline</button>}
            <button className={`btn-ghost ${run.kudosByMe ? '!border-forest !text-forest' : ''}`} aria-pressed={run.kudosByMe} onClick={act(() => (run.kudosByMe ? api.delete(`/runs/${id}/kudos`) : api.post(`/runs/${id}/kudos`)))}><Heart size={16} />Kudos {run.kudosCount}</button>
            {run.canShare && <button className="btn-ghost" onClick={share}><Share2 size={16} />Share</button>}
          </div>
          {note && <p className="text-sm text-forest" role="status">{note}</p>}
          {error && <p role="alert" className="text-sm">{error}</p>}
        </div>
        {run.isHost && (
          <div className="panel space-y-2 text-sm">
            <p><strong>Visibility:</strong> {run.visibility === 'PUBLIC' ? 'Public. Shows up in Discover.' : 'Private. Only invited runners can open it.'}</p>
            {run.canBePublic
              ? <button className="btn-ghost" onClick={act(() => api.put(`/runs/${id}/visibility`, { visibility: run.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' }))}>{run.visibility === 'PUBLIC' ? 'Make private' : 'Make public'}</button>
              : <p className="text-stone">Runs from your home can’t be made public, to keep your address private.</p>}
            {run.visibility === 'PRIVATE' && <p className="text-stone">Share links only work for people already on the run.</p>}
          </div>)}
        <div className="panel"><h2 className="mb-2 font-bold">Runners ({run.participants.filter((p) => p.status === 'JOINED').length})</h2>
          <ul className="space-y-1 text-sm">{run.participants.map((p) => <li key={p.userId}><Link className="hover:underline" to={`/u/${p.userId}`}>{p.name}</Link>{p.status === 'INVITED' && <span className="text-stone"> · invited</span>}</li>)}</ul></div>
      </aside>
    </div>
  );
}
