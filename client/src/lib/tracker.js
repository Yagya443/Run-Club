// GPS tracking maths (pure, so it is testable). Distance comes from filtered browser GPS fixes.
const R = 6371008.8, rad = (d) => (d * Math.PI) / 180;
export function hav(a, b) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
// prev: {lat,lng,t} anchor or null; fix: {lat,lng,acc,t(ms)}. Returns metres to add and whether to move the anchor.
export function acceptFix(prev, fix) {
  if (fix.acc > 35) return { add: 0, anchor: false };               // too inaccurate
  if (!prev) return { add: 0, anchor: true };
  const d = hav([prev.lat, prev.lng], [fix.lat, fix.lng]), dt = (fix.t - prev.t) / 1000;
  if (dt <= 0 || d < 5) return { add: 0, anchor: false };            // jitter while standing still
  if (d / dt > 9) return { add: 0, anchor: true };                   // GPS jump: re-anchor, don't count
  return { add: d, anchor: true };
}
export const cumulative = (coords) => coords.reduce((c, p, i) => (c.push(i ? c[i - 1] + hav(coords[i - 1], p) : 0), c), []);
export function routeProgress(coords, cum, pos) {
  let best = 0, bd = Infinity;
  coords.forEach((p, i) => { const d = hav(p, pos); if (d < bd) { bd = d; best = i; } });
  return { alongM: cum[best], offRouteM: bd, totalM: cum.at(-1) };
}
export function nextCheckpoint(alongM, totalM) {
  const k = Math.floor(alongM / 1000) + 1;
  return k * 1000 < totalM - 100 ? { label: `${k} km mark`, remainingM: k * 1000 - alongM } : { label: 'Finish', remainingM: Math.max(0, totalM - alongM) };
}
export const clock = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
