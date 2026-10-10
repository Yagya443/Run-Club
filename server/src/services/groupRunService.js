import { RunAvailability, Location, User, Route, Run, RunParticipant } from '../models/index.js';
import { generateRoutes } from './routeGenerationService.js';
import { planWithAI } from './ai/routeAIService.js';
import { reverseArea } from './geocodeService.js';
import { pathLengthM } from './geo.js';
import { assertMember } from './clubService.js';

const err = (m, s = 400) => Object.assign(new Error(m), { status: s });

async function runnerPoints(runnerIds, date) {
  const avail = await RunAvailability.find({ userId: { $in: runnerIds }, date: new Date(`${date}T00:00:00Z`) }).lean();
  const rows = await Promise.all(avail.map(async (r) => ({ ...r, location: await Location.findById(r.locationId).lean(), user: await User.findById(r.userId).select('name').lean() })));
  const byUser = new Map(); rows.forEach((r) => byUser.has(r.userId) || byUser.set(r.userId, r)); // a runner may list several times that day
  if (byUser.size !== new Set(runnerIds).size) throw err('One of those runners is no longer available. Search again.', 409);
  return [...byUser.values()];
}

// Meeting point = centre of everyone's start, snapped to the road network by the router (so it is a real, reachable spot).
export async function planGroup({ start, date, time, distanceKm, routeType, difficulty, environment, runnerIds }) {
  const rows = runnerIds.length ? await runnerPoints(runnerIds, date) : [];
  const pts = [[start.lat, start.lng], ...rows.map((r) => [r.location.lat, r.location.lng])];
  const centre = { lat: pts.reduce((s, p) => s + p[0], 0) / pts.length, lng: pts.reduce((s, p) => s + p[1], 0) / pts.length };
  const candidates = await generateRoutes({ start: centre, distanceKm, routeType });
  const ai = await planWithAI({ candidates, ctx: { time, distanceKm, routeType, difficulty, environment, runners: pts.length } });
  const best = candidates[ai.bestIndex];
  const [mLat, mLng] = best.coords[0];
  const label = (await reverseArea(mLat, mLng)) || 'Meeting point (midpoint between runners)';
  return { meetingPoint: { label, lat: mLat, lng: mLng }, route: best, title: ai.runTitle, description: ai.description,
    reason: ai.reason, groupCompatibility: ai.groupCompatibility, ai: ai.ai, participants: rows.map((r) => ({ userId: r.userId, firstName: r.user.name.split(' ')[0] })) };
}

export async function createGroupRun(userId, b) {
  if (b.clubId) await assertMember(userId, b.clubId);
  const ids = b.runners.map((r) => r.userId);
  if (ids.length) await runnerPoints(ids, b.date);
  const distanceM = Math.round(pathLengthM(b.geometry));
  const loc = await Location.create({ label: b.meetingPoint.label, lat: b.meetingPoint.lat, lng: b.meetingPoint.lng, area: b.meetingPoint.label });
  const route = await Route.create({ type: b.routeType, distanceM, difficulty: b.difficulty, geometry: b.geometry, startId: loc.id });
  const run = await Run.create({ title: b.title, description: b.description, hostId: userId, routeId: route.id, meetingPointId: loc.id, clubId: b.clubId ?? null, visibility: b.clubId ? 'PUBLIC' : 'PRIVATE', scheduledAt: b.scheduledAt });
  await RunParticipant.insertMany([{ runId: run.id, userId, status: 'JOINED' }, ...b.runners.map((r) => ({ runId: run.id, userId: r.userId, status: 'INVITED', matchScore: r.score, matchReason: r.reason }))]);
  return { runId: run.id, title: run.title, distanceKm: +(distanceM / 1000).toFixed(1), invited: ids.length };
}
