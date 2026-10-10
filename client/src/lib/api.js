import axios from 'axios';
export const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('rc_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
export const errorMessage = (e) => e?.response?.data?.error || (e?.request ? 'Can\u2019t reach the server. Check your connection.' : 'Something went wrong.');
// An expired or revoked token anywhere signs you out (but not on the login screens themselves).
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && localStorage.getItem('rc_token') && !e.config?.url?.startsWith('/auth/')) window.dispatchEvent(new Event('rc:unauthorized'));
  return Promise.reject(e);
});
