import { z } from 'zod';
import { chatJson, modelName } from './ollamaClient.js';

const schema = z.object({
  bestIndex: z.number().int().min(0), routeScore: z.number().min(0).max(100), reason: z.string().min(5).max(240),
  runTitle: z.string().min(3).max(60), description: z.string().min(10).max(260), groupCompatibility: z.enum(['high', 'medium', 'low']),
});
const SYSTEM = `You choose between route candidates and write a short title and description for a planned run.
Distances, scores and geometry are computed by code: do not change or invent numbers. Only pick from the given indexes.
Prefer the candidate that best matches the requested distance and has little doubling back, then the user's environment preference.
Title: max 6 words. Description: 1-2 plain, friendly sentences. No medical claims.
Reply with JSON only: {"bestIndex":int,"routeScore":0-100,"reason":string,"runTitle":string,"description":string,"groupCompatibility":"high"|"medium"|"low"}`;

const partOfDay = (t) => { const h = Number(t.split(':')[0]); return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; };
export function fallbackPlan({ candidates, ctx }) {
  const c = candidates[0], what = ctx.routeType === 'LOOP' ? 'loop' : 'out-and-back';
  return { bestIndex: 0, routeScore: c.score, reason: 'Closest to your distance with the least doubling back.',
    runTitle: `${partOfDay(ctx.time)} ${Math.round(c.distanceKm)}K`, description: `${ctx.difficulty.toLowerCase()} ${partOfDay(ctx.time).toLowerCase()} ${what} of ${c.distanceKm} km${ctx.runners > 1 ? ` for ${ctx.runners} runners` : ''}.`.replace(/^./, (x) => x.toUpperCase()),
    groupCompatibility: null };
}
export async function planWithAI({ candidates, ctx }, chat = chatJson) {
  try {
    const payload = { ...ctx, candidates: candidates.map((c, i) => ({ index: i, distanceKm: c.distanceKm, errorPct: c.errorPct, backtrack: c.backtrack, score: c.score })) };
    const out = await chat({ system: SYSTEM, user: JSON.stringify(payload), schema });
    if (out.bestIndex >= candidates.length) throw new Error('bestIndex out of range');
    return { ...out, ai: { used: true, model: modelName() } };
  } catch { return { ...fallbackPlan({ candidates, ctx }), ai: { used: false, error: 'Local AI unavailable; used the top-scored route and a standard title.' } }; }
}
