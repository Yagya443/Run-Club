import { Link } from 'react-router-dom';
import { when, cap } from '../lib/format.js';
import RoutePreview from './RoutePreview.jsx';

export default function RunCard({ run, onJoin, busy }) {
  return (
    <article className="panel flex flex-col gap-3">
      <Link to={`/runs/${run.id}`} aria-label={`View ${run.title}`}><RoutePreview coords={run.preview} /></Link>
      <div>
        <h3 className="text-lg font-bold"><Link to={`/runs/${run.id}`} className="hover:underline">{run.title}</Link></h3>
        <p className="text-sm text-stone">{when(run.scheduledAt)}</p>
        <p className="text-sm text-stone">{run.distanceKm} km{run.difficulty && ` · ${cap(run.difficulty)}`} · {run.runners} {run.runners === 1 ? 'runner' : 'runners'}</p>
        <p className="text-sm text-stone">{run.area ? `Near ${run.area}` : ''}{run.distanceKmApprox ? ` · about ${run.distanceKmApprox} km from you` : ''}{run.club && <> · <Link className="underline" to={`/clubs/${run.club.id}`}>{run.club.name}</Link></>}</p>
      </div>
      {run.mine ? <Link to={`/runs/${run.id}`} className="btn-ghost mt-auto">You’re in · View</Link>
        : onJoin ? <button className="btn-primary mt-auto" disabled={busy} onClick={() => onJoin(run.id)}>Join run</button> : null}
    </article>
  );
}
