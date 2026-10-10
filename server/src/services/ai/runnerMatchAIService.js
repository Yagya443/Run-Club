import { z } from 'zod';
import { chatJson, modelName } from './ollamaClient.js';

const schema = z.object({
  matches: z.array(z.object({ userId: z.string(), reason: z.string().min(5).max(220), compatibility: z.enum(['high', 'medium', 'low']) })).max(10),
  groupCompatibility: z.enum(['high', 'medium', 'low']),
});
const pace = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} /km` : 'unknown');
const SYSTEM = `You help runners find running partners. All facts and scores are computed by code; never invent or change them.
For each candidate write one short reason (max 20 words) citing concrete factors (time gap, pace, distance, level, proximity). No medical claims.
Reply with JSON only: {"matches":[{"userId":string,"reason":string,"compatibility":"high"|"medium"|"low"}],"groupCompatibility":"high"|"medium"|"low"}`;

// Used when the model is unavailable or returns something invalid. Built from the real factors, so still truthful.
export function fallbackReason(m) {
  const bits = [m.timeOffsetMin === 0 ? 'Same start time' : `Starts ${m.timeOffsetMin} min apart`,
    m.factors.pace >= 70 ? 'similar pace' : 'different pace', m.level ? `${m.level.toLowerCase()} level` : null, `about ${m.distanceKmApprox} km away`];
  return bits.filter(Boolean).join(', ') + '.';
}

export async function explainMatches({ me, matches }, chat = chatJson) {
  const fb = (ai) => ({ matches: matches.map((m) => ({ ...m, reason: fallbackReason(m), aiUsed: false })), ai });
  if (!matches.length) return { matches: [], ai: { used: false } };
  try {
    const payload = { you: { level: me.level, pace: pace(me.paceSecPerKm), distanceKm: me.distanceKm, time: me.time },
      candidates: matches.map((m) => ({ userId: m.userId, level: m.level, pace: pace(m.paceSecPerKm), distanceKm: m.distanceKm, timeOffsetMin: m.timeOffsetMin, kmAway: m.distanceKmApprox, score: m.score, factors: m.factors })) };
    const out = await chat({ system: SYSTEM, user: JSON.stringify(payload), schema });
    const byId = new Map(out.matches.map((x) => [x.userId, x]));
    return { matches: matches.map((m) => { const x = byId.get(m.userId); return x ? { ...m, reason: x.reason, aiUsed: true } : { ...m, reason: fallbackReason(m), aiUsed: false }; }),
      ai: { used: byId.size > 0, model: modelName(), groupCompatibility: out.groupCompatibility } };
  } catch (e) { return fb({ used: false, error: 'Local AI unavailable; showing basic explanations.' }); }
}
