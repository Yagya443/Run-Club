// Offline checks: deterministic scoring + AI validation/fallback (fake model). No DB, no Ollama needed.
process.env.DATABASE_URL = 'x';
import assert from 'node:assert';
import { scoreCandidate, bucketKm } from './src/services/matchScoring.js';
import { explainMatches } from './src/services/ai/runnerMatchAIService.js';
import { planWithAI } from './src/services/ai/routeAIService.js';
const me = { level: 'BEGINNER', paceSecPerKm: 420, distanceKm: 5, time: '06:30', radiusKm: 5 };
const rahul = scoreCandidate(me, { distanceM: 600, time: '06:30', distanceKm: 5, level: 'BEGINNER', paceSecPerKm: 420 });
const aman = scoreCandidate(me, { distanceM: 1200, time: '06:30', distanceKm: 7, level: 'ADVANCED', paceSecPerKm: 300 });
console.log('Rahul', rahul.score, 'Aman', aman.score); assert(rahul.score > 90 && aman.score < 70 && rahul.score > aman.score);
assert.equal(bucketKm(600), 1); assert.equal(bucketKm(100), 0.5);
const m = [{ userId: 'a', firstName: 'A', level: 'BEGINNER', timeOffsetMin: 0, distanceKm: 5, distanceKmApprox: 1, factors: { pace: 90 }, score: 95, paceSecPerKm: 420 }];
let r = await explainMatches({ me, matches: m }, async () => ({ matches: [{ userId: 'a', reason: 'Same start time and pace.', compatibility: 'high' }], groupCompatibility: 'high' })); assert(r.matches[0].aiUsed);
r = await explainMatches({ me, matches: m }, async () => { throw new Error('boom'); }); assert(!r.matches[0].aiUsed && r.matches[0].reason.length > 5);
const cands = [{ distanceKm: 5.05, errorPct: 1, backtrack: 0, score: 98 }];
let p = await planWithAI({ candidates: cands, ctx: { time: '06:30', routeType: 'LOOP', difficulty: 'EASY', runners: 3 } }, async () => ({ bestIndex: 9, routeScore: 90, reason: 'nope nope', runTitle: 'Bad', description: 'out of range index' }));
assert(!p.ai.used && p.runTitle === 'Morning 5K'); console.log('fallback plan:', p.runTitle, '|', p.description);
console.log('all part 3 selftests passed');
