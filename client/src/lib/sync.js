import { api } from './api.js';
import { getOutbox, removeOp, updateOp } from './offlineDb.js';

let running = false;
// Sends queued start/complete actions in order. Returns how many are still waiting.
export async function flushOutbox() {
  if (running) return (await getOutbox()).length;
  running = true;
  try {
    for (const op of await getOutbox()) {
      if (op.failed) continue;
      try {
        await api.post(`/runs/${op.runId}/${op.type === 'start' ? 'start' : 'complete'}`, op.payload);
        await removeOp(op.key);
      } catch (e) {
        const s = e.response?.status;
        if (!s || s === 401) break;                                // offline or signed out: try again later
        if (s === 409 || s === 404) { await removeOp(op.key); continue; } // already done / gone: nothing to retry
        await updateOp({ ...op, failed: true, error: e.response.data?.error || 'The server rejected this.' }); // keep so the user can see it
      }
    }
  } finally { running = false; window.dispatchEvent(new Event('rc:outbox')); }
  return (await getOutbox()).filter((o) => !o.failed).length;
}
