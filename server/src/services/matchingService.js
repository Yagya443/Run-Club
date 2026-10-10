import { RunAvailability, Location, User, RunnerPreference } from '../models/index.js';
import { haversineM } from './geo.js';
import { scoreCandidate, band, bucketKm, mins, TIME_WINDOW_MIN, DIST_TOLERANCE } from './matchScoring.js';

// Database filters (date, opt-in, bounding box) + code (exact radius, time window, distance tolerance).
export async function findCandidates(userId, me) {
  const dLat = me.radiusKm / 111, dLng = me.radiusKm / (111 * Math.cos((me.start.lat * Math.PI) / 180));
  const avail = await RunAvailability.find({ userId: { $ne: userId }, date: new Date(`${me.date}T00:00:00Z`) }).lean();
  const rows = (await Promise.all(avail.map(async (r) => {
    const [location, user] = await Promise.all([Location.findOne({ _id: r.locationId, lat: { $gte: me.start.lat - dLat, $lte: me.start.lat + dLat }, lng: { $gte: me.start.lng - dLng, $lte: me.start.lng + dLng } }).lean(), User.findById(r.userId).lean()]);
    if (!location || !user) return null;
    const preference = await RunnerPreference.findOne({ userId: r.userId, openToGroupRuns: true }).lean();
    return preference ? { ...r, location, user: { ...user, preference } } : null;
  }))).filter(Boolean);
  return rows.map((r) => ({
    userId: r.userId, firstName: r.user.name.split(' ')[0], isDemo: r.user.email.endsWith('@demo.runclub.local'),
    time: r.time, distanceKm: r.distanceKm, level: r.user.preference?.level ?? 'BEGINNER', paceSecPerKm: r.user.preference?.paceSecPerKm ?? null,
    area: r.location.area, distanceM: haversineM([me.start.lat, me.start.lng], [r.location.lat, r.location.lng]), // exact lat/lng stay server-side
  }))
    .filter((c) => c.distanceM <= me.radiusKm * 1000 && Math.abs(mins(c.time) - mins(me.time)) <= TIME_WINDOW_MIN && Math.abs(c.distanceKm - me.distanceKm) <= me.distanceKm * DIST_TOLERANCE)
    .map((c) => { const { score, factors } = scoreCandidate(me, c); const { distanceM, ...safe } = c;
      return { ...safe, distanceKmApprox: bucketKm(distanceM), timeOffsetMin: Math.abs(mins(c.time) - mins(me.time)), score, band: band(score), factors }; })
    .sort((a, b) => b.score - a.score).slice(0, 10);
}

// Publish my availability so others can find me. Replaces any earlier entry for the same date/time.
export async function saveAvailability(userId, me, label) {
  const date = new Date(`${me.date}T00:00:00Z`);
  const old = await RunAvailability.find({ userId, date, time: me.time }).lean();
  await RunAvailability.deleteMany({ _id: { $in: old.map((o) => o._id) } });
  await Location.deleteMany({ _id: { $in: old.map((o) => o.locationId).filter(Boolean) } });
  const loc = await Location.create({ label: label || 'Start', lat: me.start.lat, lng: me.start.lng, userId });
  await RunAvailability.create({ userId, date, time: me.time, distanceKm: me.distanceKm, locationId: loc.id });
  await RunnerPreference.updateOne({ userId }, { $set: { level: me.level, paceSecPerKm: me.paceSecPerKm }, $setOnInsert: { userId } }, { upsert: true, setDefaultsOnInsert: true });
}
