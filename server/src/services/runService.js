import { Run, RunParticipant, Route, Location, RunClub, User, Kudos, Comment, RunReflection } from '../models/index.js';
import { trimEnds, sample } from './geo.js';
import { bucketKm } from './matchScoring.js';
import { haversineM } from './geo.js';
import { startWindowOk } from './runMath.js';

const err = (m, s = 400) => Object.assign(new Error(m), { status: s });
const MAX_RUNNERS = 50;

async function hydrate(run) {
  if (!run) return null;
  const [route, meetingPoint, club, participants] = await Promise.all([
    run.routeId ? Route.findById(run.routeId).lean() : null,
    run.meetingPointId ? Location.findById(run.meetingPointId).lean() : null,
    run.clubId ? RunClub.findById(run.clubId).select('name').lean() : null,
    RunParticipant.find({ runId: run._id }).lean(),
  ]);
  return { ...run, id: run._id, route, meetingPoint, club: club && { id: club._id, name: club.name }, participants };
}

export const runCard = (r, viewerId) => ({
  id: r.id, title: r.title, scheduledAt: r.scheduledAt, distanceKm: r.route ? +(r.route.distanceM / 1000).toFixed(1) : null,
  difficulty: r.route?.difficulty ?? null, area: r.meetingPoint?.label ?? null, club: r.club,
  runners: r.participants.filter((p) => p.status === 'JOINED').length,
  preview: r.route ? sample(trimEnds(r.route.geometry, 300), 60) : null,
  mine: r.participants.some((p) => p.userId === viewerId && p.status === 'JOINED'),
});

export async function discover(userId, { lat, lng, radiusKm = 25 }) {
  const where = { status: 'PLANNED', visibility: 'PUBLIC', scheduledAt: { $gte: new Date() } };
  if (lat != null && lng != null) {
    const d = radiusKm / 111, dl = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const points = await Location.find({ lat: { $gte: lat - d, $lte: lat + d }, lng: { $gte: lng - dl, $lte: lng + dl } }).select('_id').lean();
    where.meetingPointId = { $in: points.map((p) => p._id) };
  }
  const runs = await Run.find(where).sort({ scheduledAt: 1 }).limit(30).lean();
  const hydrated = await Promise.all(runs.map(hydrate));
  return hydrated.map((r) => ({ ...runCard(r, userId), distanceKmApprox: lat != null && r.meetingPoint ? bucketKm(haversineM([lat, lng], [r.meetingPoint.lat, r.meetingPoint.lng])) : null }));
}

export async function getRun(userId, id) {
  const raw = await Run.findById(id).lean();
  const run = await hydrate(raw);
  const mine = run?.participants.find((p) => p.userId === userId);
  if (!run || (run.visibility !== 'PUBLIC' && !mine)) throw err('Run not found.', 404);
  const joined = mine?.status === 'JOINED', isHost = run.hostId === userId;
  const [host, participants, kudos, comments, refl] = await Promise.all([
    User.findById(run.hostId).select('name').lean(),
    Promise.all(run.participants.filter((p) => joined || p.status === 'JOINED').map(async (p) => ({ ...p, user: await User.findById(p.userId).select('name').lean() }))),
    Kudos.find({ runId: id }).lean(),
    Comment.find({ runId: id }).sort({ createdAt: 1 }).limit(100).lean(),
    mine ? RunReflection.findOne({ runId: id, userId }).sort({ createdAt: -1 }).lean() : null,
  ]);
  const commentRows = await Promise.all(comments.map(async (c) => ({ ...c, user: await User.findById(c.userId).select('name').lean() })));
  return {
    id: run.id, title: run.title, description: run.description, scheduledAt: run.scheduledAt, status: run.status, visibility: run.visibility,
    distanceKm: run.route ? +(run.route.distanceM / 1000).toFixed(1) : null, difficulty: run.route?.difficulty, routeType: run.route?.type,
    club: run.club, host: host && { id: run.hostId, name: host.name }, isHost, myStatus: isHost ? 'HOST' : mine?.status ?? null, canShare: run.visibility === 'PUBLIC' || !!mine,
    canBePublic: !!run.meetingPointId,
    geometry: run.route ? (joined ? run.route.geometry : trimEnds(run.route.geometry, 300)) : null,
    meetingPoint: run.meetingPoint ? (joined ? { label: run.meetingPoint.label, lat: run.meetingPoint.lat, lng: run.meetingPoint.lng } : { label: run.meetingPoint.label }) : null,
    participants: participants.map((p) => ({ userId: p.userId, name: p.user?.name, status: p.status })),
    canStart: joined && !mine.completedAt && ['PLANNED', 'ACTIVE'].includes(run.status) && (!!mine.startedAt || startWindowOk(run.scheduledAt)),
    inProgress: !!(joined && mine.startedAt && !mine.completedAt),
    myResult: mine?.completedAt ? { completedAt: mine.completedAt, durationSec: mine.durationSec, distanceKm: +(mine.distanceM / 1000).toFixed(2), source: mine.distanceSource } : null,
    myReflection: refl && { text: refl.text, ...(refl.aiSummary || {}) },
    kudosCount: kudos.length, kudosByMe: kudos.some((k) => k.userId === userId),
    comments: commentRows.map((c) => ({ id: c._id, body: c.body, createdAt: c.createdAt, user: c.user && { id: c.userId, name: c.user.name }, mine: c.userId === userId })),
  };
}

export async function join(userId, id) {
  const run = await Run.findById(id).lean();
  const participants = await RunParticipant.find({ runId: id }).lean();
  const mine = participants.find((p) => p.userId === userId);
  if (!run || (run.visibility !== 'PUBLIC' && !mine)) throw err('Run not found.', 404);
  if (run.status !== 'PLANNED' || run.scheduledAt < new Date()) throw err('This run has already started or finished.', 409);
  if (participants.filter((p) => p.status === 'JOINED').length >= MAX_RUNNERS && mine?.status !== 'JOINED') throw err('This run is full.', 409);
  await RunParticipant.updateOne({ runId: id, userId }, { $set: { status: 'JOINED' }, $setOnInsert: { runId: id, userId } }, { upsert: true });
}
export async function leave(userId, id) {
  const run = await Run.findById(id).lean();
  if (!run) throw err('Run not found.', 404);
  if (run.hostId === userId) throw err('You’re hosting this run. Hosts can’t leave it yet.', 409);
  await RunParticipant.deleteOne({ runId: id, userId });
}
export async function setVisibility(userId, id, visibility) {
  const run = await Run.findById(id).lean();
  if (!run || run.hostId !== userId) throw err('Only the host can change this.', 403);
  if (visibility === 'PUBLIC' && !run.meetingPointId) throw err('Runs that start at your home can’t be made public. Plan a group run with a meeting point instead.', 400);
  await Run.updateOne({ _id: id }, { $set: { visibility } });
}
async function assertVisible(userId, id) {
  const [run, participant] = await Promise.all([Run.findById(id).lean(), RunParticipant.exists({ runId: id, userId })]);
  if (!run || (run.visibility !== 'PUBLIC' && !participant)) throw err('Run not found.', 404);
}
export async function kudos(userId, id, on) {
  await assertVisible(userId, id);
  if (on) await Kudos.updateOne({ runId: id, userId }, { $setOnInsert: { runId: id, userId } }, { upsert: true });
  else await Kudos.deleteOne({ runId: id, userId });
}
export async function addComment(userId, id, body) { await assertVisible(userId, id); await Comment.create({ runId: id, userId, body }); }
export async function deleteComment(userId, commentId) { await Comment.deleteOne({ _id: commentId, userId }); }
