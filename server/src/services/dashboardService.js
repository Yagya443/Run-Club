import { Run, RunParticipant, Route, Location } from '../models/index.js';

export function startOfWeek(d = new Date()) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x;
}
export function streakDays(dates) {
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  let n = 0; const c = new Date();
  if (!days.has(c.toDateString())) c.setDate(c.getDate() - 1);
  while (days.has(c.toDateString())) { n++; c.setDate(c.getDate() - 1); }
  return n;
}

export async function getDashboard(userId) {
  const participantRows = await RunParticipant.find({ userId }).lean();
  const ids = participantRows.map((p) => p.runId);
  const now = new Date();
  const [mineRuns, weekRuns, completedRows, activeRows, publicRuns, invitedRows] = await Promise.all([
    Run.find({ _id: { $in: ids }, status: { $in: ['PLANNED', 'ACTIVE'] }, scheduledAt: { $gte: new Date(Date.now() - 3 * 3600e3) } }).sort({ scheduledAt: 1 }).lean(),
    RunParticipant.find({ userId, completedAt: { $gte: startOfWeek() } }).lean(),
    RunParticipant.find({ userId, completedAt: { $ne: null } }).select('completedAt').lean(),
    Run.find({ _id: { $in: participantRows.filter((p) => p.startedAt && !p.completedAt).map((p) => p.runId) }, status: 'ACTIVE' }).limit(1).lean(),
    Run.find({ status: 'PLANNED', visibility: 'PUBLIC', scheduledAt: { $gte: now } }).sort({ scheduledAt: 1 }).limit(15).lean(),
    Run.find({ _id: { $in: participantRows.filter((p) => p.status === 'INVITED').map((p) => p.runId) }, status: 'PLANNED', scheduledAt: { $gte: now } }).sort({ scheduledAt: 1 }).limit(5).lean(),
  ]);
  const mapBrief = async (run, participantList) => {
    const [route, point, participants] = await Promise.all([
      run.routeId ? Route.findById(run.routeId).lean() : null,
      run.meetingPointId ? Location.findById(run.meetingPointId).lean() : null,
      RunParticipant.find({ runId: run._id, ...(participantList || {}) }).lean(),
    ]);
    return { id: run._id, title: run.title, scheduledAt: run.scheduledAt, distanceKm: route ? +(route.distanceM / 1000).toFixed(1) : null, area: point?.label ?? null, runners: participants.filter((p) => p.status === 'JOINED').length, route, point };
  };
  const userRuns = mineRuns.filter((r) => participantRows.some((p) => p.runId === r._id && p.status === 'JOINED' && !p.startedAt && !p.completedAt));
  const nextRunRaw = userRuns[0] ? await mapBrief(userRuns[0]) : null;
  const [pub, inv, activeRun] = await Promise.all([
    Promise.all(publicRuns.filter((r) => !participantRows.some((p) => p.runId === r._id)).slice(0, 3).map((r) => mapBrief(r))),
    Promise.all(invitedRows.map((r) => mapBrief(r))),
    activeRows[0] ? { id: activeRows[0]._id, title: activeRows[0].title } : null,
  ]);
  const brief = (r) => ({ id: r.id, title: r.title, scheduledAt: r.scheduledAt, distanceKm: r.distanceKm, area: r.area, runners: r.runners });
  return {
    nextRun: nextRunRaw && { id: nextRunRaw.id, title: nextRunRaw.title, scheduledAt: nextRunRaw.scheduledAt, distanceKm: nextRunRaw.distanceKm, difficulty: nextRunRaw.route?.difficulty ?? null, area: nextRunRaw.point?.area ?? null, otherRunners: Math.max(0, nextRunRaw.runners - 1) },
    nearbyRuns: pub.map(brief), invitations: inv.map(brief), activeRun,
    week: { runs: weekRuns.length, distanceKm: +(weekRuns.reduce((s, r) => s + (r.distanceM || 0), 0) / 1000).toFixed(1), streak: streakDays(completedRows.map((r) => r.completedAt)) },
  };
}
