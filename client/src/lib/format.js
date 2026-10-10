export const when = (iso) => new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export const pace = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} /km` : 'Not set');
export const cap = (s) => (s ? s[0] + s.slice(1).toLowerCase() : '');
