import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { flushOutbox } from '../lib/sync.js';
import { clearOffline } from '../lib/offlineDb.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
const cached = () => { try { return JSON.parse(localStorage.getItem('rc_user') || 'null'); } catch { return null; } };
const signOut = () => { ['rc_token', 'rc_user'].forEach((k) => localStorage.removeItem(k)); clearOffline(); };

export function AuthProvider({ children }) {
  const hasToken = !!localStorage.getItem('rc_token');
  // Start from the cached user so the app opens offline; the server confirms in the background.
  const [user, setUser] = useState(hasToken ? cached() : null);
  const [loading, setLoading] = useState(hasToken && !cached());

  useEffect(() => {
    if (!hasToken) return;
    api.get('/auth/me').then((r) => { setUser(r.data.user); localStorage.setItem('rc_user', JSON.stringify(r.data.user)); })
      .catch((e) => { if ([401, 404].includes(e.response?.status)) { signOut(); setUser(null); } }) // network errors keep you signed in
      .finally(() => setLoading(false));
  }, [hasToken]);

  useEffect(() => { const h = () => { signOut(); setUser(null); }; window.addEventListener('rc:unauthorized', h); return () => window.removeEventListener('rc:unauthorized', h); }, []);
  useEffect(() => { // send anything saved while offline
    if (!user) return undefined;
    flushOutbox(); const f = () => flushOutbox(); window.addEventListener('online', f); return () => window.removeEventListener('online', f);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const authenticate = useCallback(async (path, body) => {
    const { data } = await api.post(`/auth/${path}`, body);
    localStorage.setItem('rc_token', data.token); localStorage.setItem('rc_user', JSON.stringify(data.user)); setUser(data.user);
  }, []);
  const logout = useCallback(() => { signOut(); setUser(null); }, []);
  return <Ctx.Provider value={{ user, loading, login: (b) => authenticate('login', b), register: (b) => authenticate('register', b), logout }}>{children}</Ctx.Provider>;
}
