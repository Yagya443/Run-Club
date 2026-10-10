import { User, RunnerPreference, RunParticipant, Run, Follow, ClubMember, RunClub } from '../models/index.js';
import { startOfWeek, streakDays } from './dashboardService.js';

const err = (m, s = 400) => Object.assign(new Error(m), { status: s });

export async function getProfile(viewerId, id) {
  const u = await User.findById(id).lean();
  if (!u) throw err('Runner not found.', 404);
  const [preference, participants, followsMe, followers, following, memberships] = await Promise.all([
    RunnerPreference.findOne({ userId: id }).lean(),
    RunParticipant.find({ userId: id, status: 'JOINED', completedAt: { $ne: null } }).sort({ completedAt: -1 }).lean(),
    Follow.exists({ followerId: viewerId, followingId: id }),
    Follow.find({ followingId: id }).limit(50).lean(),
    Follow.find({ followerId: id }).limit(50).lean(),
    ClubMember.find({ userId: id }).limit(50).lean(),
  ]);
  const done = (await Promise.all(participants.map(async (p) => ({ p, run: await Run.findById(p.runId).lean() })))).filter((x) => x.run).map(({ p, run }) => ({ id: run.id, title: run.title, visibility: run.visibility, distanceM: p.distanceM, completedAt: p.completedAt }));
  const [followerUsers, followingUsers, clubs] = await Promise.all([
    User.find({ _id: { $in: followers.map((f) => f.followerId) } }, { name: 1 }).lean(),
    User.find({ _id: { $in: following.map((f) => f.followingId) } }, { name: 1 }).lean(),
    RunClub.find({ _id: { $in: memberships.map((m) => m.clubId) } }, { name: 1 }).lean(),
  ]);
  const wk = startOfWeek(), km = (rs) => +(rs.reduce((s, r) => s + (r.distanceM || 0), 0) / 1000).toFixed(1);
  const self = viewerId === id;
  return {
    id: u._id, name: u.name, bio: u.bio, isMe: self, isFollowing: !!followsMe,
    preference: preference && { level: preference.level, preferredDistanceKm: preference.preferredDistanceKm, preferredTime: preference.preferredTime, paceSecPerKm: preference.paceSecPerKm },
    stats: { totalRuns: done.length, totalKm: km(done), weekKm: km(done.filter((r) => r.completedAt >= wk)), streak: streakDays(done.map((r) => r.completedAt)) },
    followers: followerUsers.map((x) => ({ id: x._id, name: x.name })), following: followingUsers.map((x) => ({ id: x._id, name: x.name })), clubs: clubs.map((x) => ({ id: x._id, name: x.name })),
    recentRuns: done.filter((r) => self || r.visibility === 'PUBLIC').slice(0, 5).map((r) => ({ id: r.id, title: r.title, distanceKm: +(r.distanceM / 1000).toFixed(1), completedAt: r.completedAt })),
  };
}
export async function updateProfile(userId, b) {
  await Promise.all([
    User.updateOne({ _id: userId }, { $set: { name: b.name, bio: b.bio } }),
    RunnerPreference.updateOne({ userId }, { $set: { level: b.level, preferredDistanceKm: b.preferredDistanceKm, preferredTime: b.preferredTime, paceSecPerKm: b.paceSecPerKm } }, { upsert: true, setDefaultsOnInsert: true }),
  ]);
}
export async function follow(userId, id, on) {
  if (userId === id) throw err('You can’t follow yourself.');
  if (!(await User.exists({ _id: id }))) throw err('Runner not found.', 404);
  if (on) await Follow.updateOne({ followerId: userId, followingId: id }, { $setOnInsert: { followerId: userId, followingId: id } }, { upsert: true });
  else await Follow.deleteOne({ followerId: userId, followingId: id });
}
