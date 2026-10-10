// Pure, deterministic scoring (no DB, no AI).
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const WEIGHTS = { proximity: 0.25, time: 0.25, distance: 0.2, pace: 0.15, level: 0.15 };
export const TIME_WINDOW_MIN = 45, DIST_TOLERANCE = 0.5;
const clamp = (x) => Math.max(0, Math.min(1, x));
export const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
// Never reveal exact distance: round UP to the next 0.5 km.
export const bucketKm = (m) => Math.max(0.5, Math.ceil(m / 500) * 0.5);

// Pure + deterministic. Each factor 0..1; returns the weighted score and the breakdown the UI shows.
export function scoreCandidate(me, c) {
  const f = {
    proximity: clamp(1 - c.distanceM / (me.radiusKm * 1000)),
    time: clamp(1 - Math.abs(mins(c.time) - mins(me.time)) / TIME_WINDOW_MIN),
    distance: clamp(1 - Math.abs(c.distanceKm - me.distanceKm) / (me.distanceKm * DIST_TOLERANCE)),
    pace: me.paceSecPerKm && c.paceSecPerKm ? clamp(1 - Math.abs(c.paceSecPerKm - me.paceSecPerKm) / 90) : 0.6, // unknown pace = neutral
    level: [1, 0.6, 0.2][Math.abs(LEVELS.indexOf(c.level) - LEVELS.indexOf(me.level))],
  };
  const score = Math.round(100 * Object.entries(WEIGHTS).reduce((s, [k, w]) => s + f[k] * w, 0));
  return { score, factors: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Math.round(v * 100)])) };
}
export const band = (s) => (s >= 80 ? 'Strong match' : s >= 60 ? 'Good match' : 'Possible match');

