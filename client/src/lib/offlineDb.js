// Small IndexedDB wrapper: saved runs (with route geometry) + an outbox of actions to send when back online.
// Every function degrades to a no-op if IndexedDB is unavailable (e.g. some private modes).
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open('runclub', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('runs', { keyPath: 'id' }); r.result.createObjectStore('outbox', { keyPath: 'key' }); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = async (store, mode, fn) => {
  try { const db = await open(); return await new Promise((res, rej) => { const t = db.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error); }); }
  catch { return null; }
};
export const cacheRun = (run) => tx('runs', 'readwrite', (s) => s.put({ ...run, savedAt: Date.now() }));
export const getCachedRun = (id) => tx('runs', 'readonly', (s) => s.get(id));
export const listCachedRuns = async () => (await tx('runs', 'readonly', (s) => s.getAll())) || [];
export const getOutbox = async () => (await tx('outbox', 'readonly', (s) => s.getAll())) || [];
export const queue = (op) => tx('outbox', 'readwrite', (s) => s.put({ ...op, key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }));
export const updateOp = (op) => tx('outbox', 'readwrite', (s) => s.put(op));
export const removeOp = (key) => tx('outbox', 'readwrite', (s) => s.delete(key));
export async function removeRunOps(runId) { for (const o of await getOutbox()) if (o.runId === runId) await removeOp(o.key); }
export async function clearOffline() { await tx('runs', 'readwrite', (s) => s.clear()); await tx('outbox', 'readwrite', (s) => s.clear()); }
