// Deterministic geospatial helpers. No AI here by design.
const R = 6371008.8, rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;

export function haversineM([lat1, lng1], [lat2, lng2]) {
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export function pathLengthM(pts) { let t = 0; for (let i = 1; i < pts.length; i++) t += haversineM(pts[i - 1], pts[i]); return t; }

// Point `distM` from `origin` along compass bearing (degrees).
export function destination([lat, lng], bearingDeg, distM) {
  const d = distM / R, b = rad(bearingDeg), p1 = rad(lat), l1 = rad(lng);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [deg(p2), ((deg(l2) + 540) % 360) - 180];
}
// Drop points closer than minM to the previous kept point (keeps endpoints).
export function thin(pts, minM = 6) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) if (haversineM(out[out.length - 1], pts[i]) >= minM) out.push(pts[i]);
  out.push(pts[pts.length - 1]); return out;
}
// Share of points revisiting ground covered earlier (not just the previous few points). 0 = clean loop.
export function backtrackRatio(pts) {
  const seen = new Map(); let repeats = 0;
  pts.forEach((p, i) => {
    const k = `${Math.round(p[0] * 1e4)}:${Math.round(p[1] * 1e4)}`; // ~11 m cells
    if (seen.has(k) && i - seen.get(k) > 15) repeats++;
    seen.set(k, i);
  });
  return repeats / pts.length;
}

// Privacy helpers for public previews: hide the exact start/finish spot, and keep payloads small.
export function trimEnds(pts, m = 300) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + haversineM(pts[i - 1], pts[i]));
  const total = cum.at(-1), out = pts.filter((_, i) => cum[i] >= m && total - cum[i] >= m);
  return out.length >= 2 ? out : pts.slice(Math.floor(pts.length / 3), Math.ceil((2 * pts.length) / 3));
}
export function sample(pts, n = 60) {
  if (pts.length <= n) return pts;
  const step = (pts.length - 1) / (n - 1); return Array.from({ length: n }, (_, i) => pts[Math.round(i * step)]);
}
