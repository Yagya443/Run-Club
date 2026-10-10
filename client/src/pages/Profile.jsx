import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import { pace, cap } from '../lib/format.js';

const PACES = [[null, 'Not set'], [420, '7:00 /km or easier'], [360, '6:00 /km'], [300, '5:00 /km'], [270, '4:30 /km or faster']];
const initials = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const Stat = ({ v, l }) => <div><p className="font-display text-2xl font-bold text-forest">{v}</p><p className="text-sm text-stone">{l}</p></div>;
const People = ({ title, list }) => <details className="panel"><summary className="cursor-pointer font-semibold">{title} ({list.length})</summary><ul className="mt-2 space-y-1 text-sm">{list.map((u) => <li key={u.id}><Link className="hover:underline" to={`/u/${u.id}`}>{u.name}</Link></li>)}</ul></details>;

export default function Profile() {
  const { id = 'me' } = useParams();
  const [p, setP] = useState(null); const [error, setError] = useState(''); const [edit, setEdit] = useState(null);
  const load = useCallback(() => api.get(`/users/${id}`).then((r) => setP(r.data.profile)).catch((e) => setError(errorMessage(e))), [id]);
  useEffect(() => { setP(null); load(); }, [load]);
  const [ai, setAi] = useState(null);
  useEffect(() => { if (p?.isMe) api.get('/ai/status').then((r) => setAi(r.data)).catch(() => {}); }, [p?.isMe]);
  async function toggleFollow() { try { await api[p.isFollowing ? 'delete' : 'post'](`/users/${p.id}/follow`); load(); } catch (e) { setError(errorMessage(e)); } }
  async function save(e) {
    e.preventDefault(); setError('');
    try { await api.put('/me/profile', { ...edit, preferredDistanceKm: Number(edit.preferredDistanceKm), paceSecPerKm: edit.paceSecPerKm ? Number(edit.paceSecPerKm) : null, preferredTime: edit.preferredTime || null }); setEdit(null); load(); }
    catch (err) { const f = err?.response?.data?.fields; setError(f ? Object.values(f).flat().join(' ') : errorMessage(err)); }
  }
  if (error && !p) return <p role="alert" className="panel">{error}</p>;
  if (!p) return <p className="text-stone">Loading…</p>;
  const pr = p.preference;
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-sage font-display text-xl font-bold text-forest-dark">{initials(p.name)}</div>
        <div className="flex-1"><h1 className="text-3xl font-bold">{p.name}</h1>{p.bio && <p className="text-stone">{p.bio}</p>}</div>
        {p.isMe ? <button className="btn-ghost" onClick={() => setEdit({ name: p.name, bio: p.bio || '', level: pr?.level || 'BEGINNER', preferredDistanceKm: pr?.preferredDistanceKm ?? 5, preferredTime: pr?.preferredTime || '', paceSecPerKm: pr?.paceSecPerKm || '' })}>Edit profile</button>
          : <button className={p.isFollowing ? 'btn-ghost' : 'btn-primary'} onClick={toggleFollow}>{p.isFollowing ? 'Following' : 'Follow'}</button>}
      </header>
      {error && <p role="alert" className="panel">{error}</p>}
      {edit && <form onSubmit={save} className="panel grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Name<input className="field mt-1" value={edit.name} onChange={set('name')} required /></label>
        <label className="text-sm font-medium">Level<select className="field mt-1" value={edit.level} onChange={set('level')}>{['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((l) => <option key={l} value={l}>{cap(l)}</option>)}</select></label>
        <label className="text-sm font-medium sm:col-span-2">Bio<textarea className="field mt-1" rows="2" maxLength="240" value={edit.bio} onChange={set('bio')} /></label>
        <label className="text-sm font-medium">Preferred distance (km)<input className="field mt-1" inputMode="decimal" value={edit.preferredDistanceKm} onChange={set('preferredDistanceKm')} /></label>
        <label className="text-sm font-medium">Preferred start time<input type="time" className="field mt-1" value={edit.preferredTime} onChange={set('preferredTime')} /></label>
        <label className="text-sm font-medium">Usual pace<select className="field mt-1" value={edit.paceSecPerKm || ''} onChange={set('paceSecPerKm')}>{PACES.map(([v, l]) => <option key={l} value={v || ''}>{l}</option>)}</select></label>
        <div className="flex gap-2 sm:col-span-2"><button className="btn-primary">Save</button><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button></div></form>}
      <section className="panel grid grid-cols-2 gap-4 sm:grid-cols-4"><Stat v={p.stats.totalRuns} l="runs" /><Stat v={p.stats.totalKm} l="km total" /><Stat v={p.stats.weekKm} l="km this week" /><Stat v={p.stats.streak} l="day streak" /></section>
      {pr && <section className="panel grid gap-1 text-sm sm:grid-cols-4"><p><span className="text-stone">Level</span><br />{cap(pr.level)}</p><p><span className="text-stone">Preferred distance</span><br />{pr.preferredDistanceKm} km</p><p><span className="text-stone">Preferred time</span><br />{pr.preferredTime || 'Not set'}</p><p><span className="text-stone">Pace</span><br />{pace(pr.paceSecPerKm)}</p></section>}
      <section><h2 className="mb-2 text-xl font-bold">Recent runs</h2>
        {p.recentRuns.length ? <ul className="space-y-2">{p.recentRuns.map((r) => <li key={r.id} className="panel !py-3"><Link className="font-semibold hover:underline" to={`/runs/${r.id}`}>{r.title}</Link> · {r.distanceKm} km</li>)}</ul> : <div className="panel text-stone">No completed runs yet.</div>}</section>
      <div className="grid gap-3 sm:grid-cols-2"><People title="Followers" list={p.followers} /><People title="Following" list={p.following} /></div>
      {p.isMe && ai && <p className="text-xs text-stone">Local AI: {ai.reachable && ai.modelInstalled ? `${ai.model} is ready.` : ai.reachable ? `Ollama is running but ${ai.model} isn’t installed (run: ollama pull ${ai.model}).` : 'Ollama isn’t reachable. Matching and reflections will use basic explanations.'}</p>}
      {p.clubs.length > 0 && <section><h2 className="mb-2 text-xl font-bold">Clubs</h2><p>{p.clubs.map((c, i) => <span key={c.id}>{i > 0 && ', '}<Link className="underline" to={`/clubs/${c.id}`}>{c.name}</Link></span>)}</p></section>}
    </div>
  );
}
