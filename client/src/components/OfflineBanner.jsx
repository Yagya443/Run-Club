import { useEffect, useState } from 'react';
import { getOutbox, removeOp } from '../lib/offlineDb.js';

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine); const [ops, setOps] = useState([]);
  useEffect(() => {
    const refresh = () => getOutbox().then(setOps);
    const up = () => { setOnline(true); refresh(); }, down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down); window.addEventListener('rc:outbox', refresh); refresh();
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); window.removeEventListener('rc:outbox', refresh); };
  }, []);
  const pending = ops.filter((o) => !o.failed).length, failed = ops.filter((o) => o.failed);
  if (online && !pending && !failed.length) return null;
  return (
    <div role="status" className="border-b border-line bg-sun/30 px-4 py-2 text-center text-sm">
      {!online && <p>You’re offline. Saved runs and recording a run still work. Planning, matching, comments and reflections need a connection.</p>}
      {pending > 0 && <p>{pending} saved {pending === 1 ? 'action is' : 'actions are'} waiting to sync{online ? '…' : ' once you’re back online.'}</p>}
      {failed.map((o) => <p key={o.key}>A saved run couldn’t sync: {o.error} <button className="underline" onClick={() => removeOp(o.key).then(() => window.dispatchEvent(new Event('rc:outbox')))}>Discard</button></p>)}
    </div>
  );
}
