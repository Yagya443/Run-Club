import { Run, RunParticipant, Route, RunReflection } from '../models/index.js';
import { startWindowOk, plausible, mentionsDiscomfort } from './runMath.js';
import { reflect } from './ai/runReflectionAIService.js';
import { startOfWeek, streakDays } from './dashboardService.js';

const err = (m, s = 400) => Object.assign(new Error(m), { status: s });
async function mine(userId, runId) {
  const p = await RunParticipant.findOne({ runId, userId }).lean();
  if (p) p.run = await Run.findById(runId).lean();
  if (!p || p.status !== 'JOINED') throw err('You’re not on this run.', 403);
  return p;
}

// clientStartedAt lets an offline start sync later with its real time (accepted only if recent and not in the future).
export async function start(userId, runId, clientStartedAt) {
  const p = await mine(userId, runId);
  if (p.completedAt) throw err('You’ve already finished this run.', 409);
  if (p.startedAt) return { startedAt: p.startedAt }; // resume
  if (!['PLANNED', 'ACTIVE'].includes(p.run.status)) throw err('This run can’t be started.', 409);
  const now = clientStartedAt && clientStartedAt.getTime() <= Date.now() + 60000 && Date.now() - clientStartedAt.getTime() < 48 * 3600e3 ? clientStartedAt : new Date();
  if (!startWindowOk(p.run.scheduledAt, now.getTime())) throw err('You can start a run up to 3 hours before it’s scheduled.', 409);
  await RunParticipant.updateOne({ runId, userId }, { $set: { startedAt: now } });
  await Run.updateOne({ _id: runId }, { $set: { status: 'ACTIVE', startedAt: p.run.startedAt ?? now } });
  return { startedAt: now };
}

export async function complete(userId, runId, { durationSec, distanceM, source }) {
  const p = await mine(userId, runId);
  if (!p.startedAt) throw err('Start the run first.', 409);
  if (p.completedAt) throw err('You’ve already finished this run.', 409);
  if (!plausible(durationSec, distanceM)) throw err('Those numbers don’t look right for a run. Check the distance and time.');
  const now = new Date();
  await RunParticipant.updateOne({ runId, userId }, { $set: { completedAt: now, durationSec, distanceM, distanceSource: source } });
  const open = await RunParticipant.countDocuments({ runId, status: 'JOINED', completedAt: null });
  if (p.run.hostId === userId || open === 0) await Run.updateOne({ _id: runId }, { $set: { status: 'COMPLETED', completedAt: now, durationSec, distanceM } });
}

export async function discard(userId, runId) {
  const p = await mine(userId, runId);
  if (!p.startedAt || p.completedAt) throw err('There’s no run in progress to discard.', 409);
  await RunParticipant.updateOne({ runId, userId }, { $unset: { startedAt: 1 } });
  const others = await RunParticipant.countDocuments({ runId, startedAt: { $ne: null } });
  if (!others) await Run.updateOne({ _id: runId }, { $set: { status: 'PLANNED' }, $unset: { startedAt: 1 } });
}

export async function addReflection(userId, runId, text) {
  const p = await mine(userId, runId);
  if (!p.completedAt) throw err('Finish the run before reflecting on it.', 409);
  const recent = await RunParticipant.find({ userId, completedAt: { $ne: null }, runId: { $ne: runId } }).sort({ completedAt: -1 }).limit(3).lean();
  const facts = { distanceKm: +(p.distanceM / 1000).toFixed(2), durationSec: p.durationSec, plannedKm: null, source: p.distanceSource, withOtherRunners: (await RunParticipant.countDocuments({ runId, status: 'JOINED' })) > 1 };
  const route = p.run.routeId ? await Route.findById(p.run.routeId).lean() : null;
  if (route) Object.assign(facts, { plannedKm: +(route.distanceM / 1000).toFixed(1), difficulty: route.difficulty, routeType: route.type });
  const out = await reflect({ facts, text, recentKm: recent.map((r) => +(r.distanceM / 1000).toFixed(1)) });
  const aiSummary = { summary: out.summary, highlight: out.highlight, nextRun: out.nextRun, ai: out.ai, careNote: mentionsDiscomfort(text) ? 'You mentioned some discomfort. Rest if you need to, and talk to a healthcare professional if it continues.' : null };
  await RunReflection.updateOne({ runId, userId }, { $set: { text, aiSummary }, $setOnInsert: { runId, userId, createdAt: new Date() } }, { upsert: true });
  return { text, ...aiSummary };
}

const dayKey = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
export async function stats(userId) {
  const rows = await RunParticipant.find({ userId, status: 'JOINED', completedAt: { $ne: null } }).sort({ completedAt: -1 }).lean();
  const withRuns = await Promise.all(rows.map(async (r) => ({ ...r, run: await Run.findById(r.runId).select('title').lean() })));
  const km = (rs) => +(rs.reduce((s, r) => s + (r.distanceM || 0), 0) / 1000).toFixed(1);
  const weeks = Array.from({ length: 8 }, (_, i) => { const s = startOfWeek(); s.setDate(s.getDate() - 7 * (7 - i)); const e = new Date(s); e.setDate(e.getDate() + 7); return { label: dayKey(s), km: km(withRuns.filter((r) => r.completedAt >= s && r.completedAt < e)) }; });
  const months = Array.from({ length: 6 }, (_, i) => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth() - (5 - i), 1), e = new Date(s.getFullYear(), s.getMonth() + 1, 1); return { label: s.toLocaleDateString([], { month: 'short' }), km: km(withRuns.filter((r) => r.completedAt >= s && r.completedAt < e)) }; });
  return { totalRuns: withRuns.length, totalKm: km(withRuns), weekKm: weeks.at(-1).km, monthKm: months.at(-1).km, streak: streakDays(withRuns.map((r) => r.completedAt)),
    longestKm: withRuns.length ? +(Math.max(...withRuns.map((r) => r.distanceM || 0)) / 1000).toFixed(1) : 0, weeks, months,
    runs: withRuns.slice(0, 50).map((r) => ({ runId: r.runId, title: r.run?.title, completedAt: r.completedAt, distanceKm: +((r.distanceM || 0) / 1000).toFixed(2), durationSec: r.durationSec })) };
}
