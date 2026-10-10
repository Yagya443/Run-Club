// Pure helpers (no DB, no AI): validation of user-reported results and safety clamps.
export const startWindowOk = (scheduledAt, at = Date.now()) => { const dt = new Date(scheduledAt).getTime() - at; return dt <= 3 * 3600e3 && dt >= -24 * 3600e3; };
// ~9 m/s is faster than any human sustains over 100 m+; below 0.4 m/s isn't a run. Rejects typos and bad GPS, not slow runners.
export const plausible = (durationSec, distanceM) => { const v = distanceM / durationSec; return v >= 0.4 && v <= 9; };
export const DISCOMFORT = /\b(pain|painful|hurt|hurts|injur\w*|dizzy|faint\w*|chest|sprain\w*|swollen|limp\w*)\b/i;
export const mentionsDiscomfort = (t) => DISCOMFORT.test(t);
// Next suggested distance: never more than +25% or below half of what they just ran; rounded to 0.5 km.
export const clampNext = (suggested, ranKm) => Math.max(1, Math.round(Math.min(ranKm * 1.25, Math.max(ranKm * 0.5, suggested)) * 2) / 2);
export const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
