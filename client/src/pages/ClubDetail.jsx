import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import RunCard from '../components/RunCard.jsx';

export default function ClubDetail() {
  const { id } = useParams();
  const [club, setClub] = useState(null); const [error, setError] = useState('');
  const load = useCallback(() => api.get(`/clubs/${id}`).then((r) => setClub(r.data.club)).catch((e) => setError(errorMessage(e))), [id]);
  useEffect(() => { load(); }, [load]);
  async function toggle() { try { await api.post(`/clubs/${id}/${club.isMember ? 'leave' : 'join'}`); load(); } catch (e) { setError(errorMessage(e)); } }
  if (error && !club) return <p role="alert" className="panel">{error}</p>;
  if (!club) return <p className="text-stone">Loading…</p>;
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{club.name}</h1>
        {club.description && <p className="max-w-xl text-stone">{club.description}</p>}
        <p className="text-sm text-stone">{club.members.length} members</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button className={club.isMember ? 'btn-ghost' : 'btn-primary'} onClick={toggle}>{club.isMember ? 'Leave club' : 'Join club'}</button>
          {club.isMember && <Link to={`/plan?club=${club.id}`} className="btn-primary">Plan a group run</Link>}
        </div>
        {error && <p role="alert" className="text-sm">{error}</p>}
      </header>
      <section><h2 className="mb-3 text-xl font-bold">Upcoming runs</h2>
        {club.runs.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{club.runs.map((r) => <RunCard key={r.id} run={r} />)}</div>
          : <div className="panel text-stone">No upcoming runs.{club.isMember ? ' Plan one for the club.' : ' Join the club to schedule one.'}</div>}</section>
      <section><h2 className="mb-3 text-xl font-bold">Members</h2>
        <ul className="grid gap-2 sm:grid-cols-2">{club.members.map((m) => <li key={m.userId} className="panel !py-3"><Link className="font-semibold hover:underline" to={`/u/${m.userId}`}>{m.name}</Link>{m.role === 'OWNER' && <span className="ml-2 text-sm text-stone">Owner</span>}</li>)}</ul></section>
    </div>
  );
}
