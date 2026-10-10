import { Location, Route, Run, RunParticipant } from '../models/index.js';
import { pathLengthM, haversineM } from './geo.js';

const titleFor = (d, km) => `${d.getHours() < 12 ? 'Morning' : d.getHours() < 17 ? 'Afternoon' : 'Evening'} ${Math.round(km)}K`;

// Saves the chosen route and schedules it as a run. Distance is recomputed server-side; client geometry is not trusted.
export async function saveRoute(userId, { start, routeType, difficulty, geometry, scheduledAt }) {
  if (haversineM(geometry[0], [start.lat, start.lng]) > 250) { const e = new Error('Route does not begin at the chosen start.'); e.status = 400; throw e; }
  const distanceM = Math.round(pathLengthM(geometry));
  const when = new Date(scheduledAt);
  const loc = await Location.create({ label: start.label, lat: start.lat, lng: start.lng, userId });
  const route = await Route.create({ type: routeType, distanceM, difficulty, geometry, startId: loc.id });
  const run = await Run.create({ title: titleFor(when, distanceM / 1000), hostId: userId, routeId: route.id, scheduledAt: when });
  await RunParticipant.create({ runId: run.id, userId });
  return { runId: run.id, routeId: route.id, title: run.title, distanceKm: +(distanceM / 1000).toFixed(1) };
}
