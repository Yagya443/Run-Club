import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User, RunnerPreference, RunAvailability, Location, RunClub, ClubMember, Route, Run, RunParticipant } from '../src/models/index.js';
import { destination } from '../src/services/geo.js';
import { generateRoutes } from '../src/services/routeGenerationService.js';

await connectDatabase();
const origin = [Number(process.env.SEED_LAT || 19.4559), Number(process.env.SEED_LNG || 72.7925)];
const main = await User.findOneAndUpdate({ email: 'yagna@example.com' }, { $setOnInsert: { name: 'Yagna', passwordHash: await bcrypt.hash('password123', 12) } }, { upsert: true, new: true });
await RunnerPreference.updateOne({ userId: main.id }, { $setOnInsert: { userId: main.id } }, { upsert: true, setDefaultsOnInsert: true });
const demo = [['Rahul', 5, '06:30', 'BEGINNER', 420, 600, 40], ['Priya', 5.2, '06:20', 'BEGINNER', 430, 800, 140], ['Aman', 7, '06:30', 'ADVANCED', 300, 1200, 250], ['Neha', 5, '07:15', 'INTERMEDIATE', 380, 2000, 320], ['Karan', 10, '06:30', 'ADVANCED', 290, 3000, 200]];
const hash = await bcrypt.hash(`demo-${Math.random()}`, 10);
for (const [name, km, time, level, pace, m, bearing] of demo) {
  const email = `${name.toLowerCase()}@demo.runclub.local`;
  const user = await User.findOneAndUpdate({ email }, { $setOnInsert: { name, passwordHash: hash } }, { upsert: true, new: true });
  await RunnerPreference.updateOne({ userId: user.id }, { $set: { level, paceSecPerKm: pace, openToGroupRuns: true, preferredDistanceKm: km, preferredTime: time }, $setOnInsert: { userId: user.id } }, { upsert: true, setDefaultsOnInsert: true });
  const old = await RunAvailability.find({ userId: user.id }).lean();
  await RunAvailability.deleteMany({ userId: user.id });
  await Location.deleteMany({ _id: { $in: old.map((a) => a.locationId).filter(Boolean) } });
  const [lat, lng] = destination(origin, bearing, m);
  for (let d = 0; d < 3; d++) {
    const date = new Date(); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() + d);
    const loc = await Location.create({ label: 'Demo home', lat, lng, area: 'Demo neighbourhood', userId: user.id });
    await RunAvailability.create({ userId: user.id, date, time, distanceKm: km, locationId: loc.id });
  }
}
const who = (n) => User.findOne({ email: `${n}@demo.runclub.local` });
const owner = await who('rahul');
const club = await RunClub.findOneAndUpdate({ name: 'Sunday Morning Runners' }, { $setOnInsert: { description: 'Easy social runs on Sunday mornings. All paces welcome.', ownerId: owner.id } }, { upsert: true, new: true });
for (const [n, role] of [['rahul', 'OWNER'], ['priya', 'MEMBER'], ['aman', 'MEMBER'], ['neha', 'MEMBER']]) {
  const user = await who(n);
  await ClubMember.updateOne({ clubId: club.id, userId: user.id }, { $set: { role }, $setOnInsert: { clubId: club.id, userId: user.id } }, { upsert: true });
}
try {
  const oldRuns = await Run.find({ hostId: owner.id, clubId: club.id }).select('_id').lean();
  await Run.deleteMany({ _id: { $in: oldRuns.map((r) => r._id) } });
  await RunParticipant.deleteMany({ runId: { $in: oldRuns.map((r) => r._id) } });
  const mp = destination(origin, 20, 500);
  const [best] = await generateRoutes({ start: { lat: mp[0], lng: mp[1] }, distanceKm: 5, routeType: 'LOOP' });
  const [lat, lng] = best.coords[0];
  const when = new Date(); when.setDate(when.getDate() + ((7 - when.getDay()) % 7 || 7)); when.setHours(6, 30, 0, 0);
  const loc = await Location.create({ label: 'Demo meeting point', lat, lng, area: 'Demo meeting point' });
  const route = await Route.create({ type: 'LOOP', distanceM: Math.round(best.distanceKm * 1000), difficulty: 'EASY', geometry: best.coords, startId: loc.id });
  const members = await Promise.all(['rahul', 'priya', 'aman'].map(who));
  const run = await Run.create({ title: 'Sunday Sunrise 5K', description: 'Easy social loop. All paces welcome.', hostId: owner.id, clubId: club.id, routeId: route.id, meetingPointId: loc.id, visibility: 'PUBLIC', scheduledAt: when });
  await RunParticipant.insertMany(members.map((u) => ({ runId: run.id, userId: u.id, status: 'JOINED' })));
  console.log('Seeded demo club run: Sunday Sunrise 5K');
} catch (e) { console.log(`Skipped demo club run (routing service unreachable): ${e.message}`); }
console.log(`Seeded yagna@example.com / password123 and 5 demo runners near ${origin}.`);
await disconnectDatabase();
