import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import { when } from '../lib/format.js';

export default function Clubs() {
  const [clubs, setClubs] = useState(null); const [q, setQ] = useState(''); const [error, setError] = useState('');
  const [open, setOpen] = useState(false); const [form, setForm] = useState({ name: '', description: '' });
  const load = useCallback((query = '') => api.get('/clubs', { params: { q: query } }).then((r) => setClubs(r.data.clubs)).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { load(); }, [load]);
  async function create(e) {
    e.preventDefault(); setError('');
    try { await api.post('/clubs', form); setOpen(false); setForm({ name: '', description: '' }); load(q); }
    catch (err) { const f = err?.response?.data?.fields; setError(f ? Object.values(f).flat().join(' ') : errorMessage(err)); }
  }
  async function toggle(c) { try { await api.post(`/clubs/${c.id}/${c.isMember ? 'leave' : 'join'}`); load(q); } catch (err) { setError(errorMessage(err)); } }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Run clubs</h1><button className="btn-primary" onClick={() => setOpen(!open)}>{open ? 'Cancel' : 'Create a club'}</button></div>
      {open && <form onSubmit={create} className="panel space-y-3">
        <label className="block text-sm font-medium">Club name<input className="field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label className="block text-sm font-medium">What’s it about?<textarea className="field mt-1" rows="2" maxLength="300" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button className="btn-primary">Create club</button></form>}
      <form onSubmit={(e) => { e.preventDefault(); load(q); }}><input className="field" placeholder="Search clubs" aria-label="Search clubs" value={q} onChange={(e) => setQ(e.target.value)} /></form>
      {error && <p role="alert" className="panel">{error}</p>}
      {clubs?.length === 0 && <div className="panel text-stone">No clubs found. Start one and invite your running friends.</div>}
      <div className="grid gap-4 sm:grid-cols-2">{clubs?.map((c) => (
        <article key={c.id} className="panel flex flex-col gap-2">
          <h2 className="text-xl font-bold"><Link to={`/clubs/${c.id}`} className="hover:underline">{c.name}</Link></h2>
          <p className="text-sm text-stone">{c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}</p>
          {c.description && <p className="text-sm">{c.description}</p>}
          <p className="text-sm text-stone">{c.nextRun ? <>Next run: <Link className="underline" to={`/runs/${c.nextRun.id}`}>{c.nextRun.title}</Link> · {when(c.nextRun.scheduledAt)} · {c.nextRun.runners} runners</> : 'No upcoming runs yet.'}</p>
          <button className={`mt-auto ${c.isMember ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggle(c)}>{c.isMember ? 'Leave club' : 'Join club'}</button>
        </article>))}</div>
    </div>
  );
}
