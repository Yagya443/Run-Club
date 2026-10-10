import { RunClub, ClubMember, Run, RunParticipant, Route, Location, User } from '../models/index.js';
import { runCard } from './runService.js';

const err = (m, s = 400) => Object.assign(new Error(m), { status: s });
const upcoming = () => ({ status: 'PLANNED', visibility: 'PUBLIC', scheduledAt: { $gte: new Date() } });

export async function list(userId, q) {
  const clubs = await RunClub.find(q ? { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {}).sort({ createdAt: -1 }).limit(40).lean();
  return Promise.all(clubs.map(async (c) => {
    const [memberCount, isMember, runs] = await Promise.all([ClubMember.countDocuments({ clubId: c._id }), ClubMember.exists({ clubId: c._id, userId }), Run.find({ ...upcoming(), clubId: c._id }).sort({ scheduledAt: 1 }).limit(1).lean()]);
    let nextRun = null;
    if (runs[0]) {
      const [route, participants] = await Promise.all([runs[0].routeId ? Route.findById(runs[0].routeId).lean() : null, RunParticipant.find({ runId: runs[0]._id, status: 'JOINED' }).lean()]);
      nextRun = { id: runs[0]._id, title: runs[0].title, scheduledAt: runs[0].scheduledAt, distanceKm: route ? +(route.distanceM / 1000).toFixed(1) : null, runners: participants.length };
    }
    return { id: c._id, name: c.name, description: c.description, memberCount, isMember: !!isMember, nextRun };
  }));
}
export async function create(userId, { name, description }) {
  const c = await RunClub.create({ name, description, ownerId: userId });
  await ClubMember.create({ clubId: c.id, userId, role: 'OWNER' });
  return { id: c.id };
}
export async function get(userId, id) {
  const c = await RunClub.findById(id).lean();
  if (!c) throw err('Club not found.', 404);
  const [members, rawRuns] = await Promise.all([ClubMember.find({ clubId: id }).sort({ role: -1 }).limit(200).lean(), Run.find({ ...upcoming(), clubId: id }).sort({ scheduledAt: 1 }).limit(20).lean()]);
  const memberDetails = await Promise.all(members.map(async (m) => ({ ...m, user: await User.findById(m.userId).select('name').lean() })));
  const runs = await Promise.all(rawRuns.map(async (r) => {
    const [route, meetingPoint, participants] = await Promise.all([r.routeId ? Route.findById(r.routeId).lean() : null, r.meetingPointId ? Location.findById(r.meetingPointId).lean() : null, RunParticipant.find({ runId: r._id }).lean()]);
    return runCard({ ...r, id: r._id, route, meetingPoint, club: { id, name: c.name }, participants }, userId);
  }));
  const me = memberDetails.find((m) => m.userId === userId);
  return { id: c._id, name: c.name, description: c.description, isMember: !!me, myRole: me?.role ?? null, members: memberDetails.map((m) => ({ userId: m.userId, name: m.user?.name ?? 'Runner', role: m.role })), runs };
}
export async function join(userId, id) {
  if (!(await RunClub.exists({ _id: id }))) throw err('Club not found.', 404);
  await ClubMember.updateOne({ clubId: id, userId }, { $setOnInsert: { clubId: id, userId, role: 'MEMBER' } }, { upsert: true });
}
export async function leave(userId, id) {
  const m = await ClubMember.findOne({ clubId: id, userId }).lean();
  if (m?.role === 'OWNER') throw err('Club owners can’t leave their club yet.', 409);
  await ClubMember.deleteOne({ clubId: id, userId });
}
export async function assertMember(userId, id) {
  if (!(await ClubMember.exists({ clubId: id, userId }))) throw err('Join the club to schedule runs for it.', 403);
}
