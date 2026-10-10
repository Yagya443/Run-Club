import { destination, haversineM, thin, backtrackRatio } from './geo.js';
import { osrmRoute } from './osrmClient.js';

const WINDING = 1.3;            // roads are ~30% longer than straight lines
const BEARINGS = [0, 60, 120, 180, 240, 300];
const TOLERANCE = 0.10;         // reject routes more than 10% off target
const PASSES = 3;               // scale-and-reroute refinements per bearing

const waypointsFor = (type, start, bearing, scale, targetM) => {
  if (type === 'OUT_AND_BACK') return [start, destination(start, bearing, (targetM / 2 / WINDING) * scale), start];
  const s = (targetM / 3 / WINDING) * scale; // equilateral triangle through start
  return [start, destination(start, bearing, s), destination(start, bearing + 60, s), start];
};

// Score 0-100: distance accuracy (70%) + how little the route doubles back (30%). Out-and-back is expected to retrace.
function score(distanceM, targetM, coords, type) {
  const err = Math.abs(distanceM - targetM) / targetM;
  const accuracy = Math.max(0, 1 - err / TOLERANCE);
  const back = type === 'OUT_AND_BACK' ? 0 : Math.min(1, backtrackRatio(coords) * 2);
  return { score: Math.round(100 * (0.7 * accuracy + 0.3 * (1 - back))), errorPct: +(err * 100).toFixed(1), backtrack: +back.toFixed(2) };
}

export async function generateRoutes({ start, distanceKm, routeType = 'LOOP' }, router = osrmRoute) {
  const targetM = distanceKm * 1000, startPt = [start.lat, start.lng];
  const results = await Promise.allSettled(BEARINGS.map(async (bearing) => {
    let scale = 1, best = null;
    for (let i = 0; i < PASSES; i++) {
      const r = await router(waypointsFor(routeType, startPt, bearing, scale, targetM));
      const err = Math.abs(r.distanceM - targetM);
      if (!best || err < best.err) best = { ...r, err, bearing };
      if (err / targetM < 0.03) break;
      scale *= targetM / r.distanceM;
    }
    return best;
  }));
  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) { const e = new Error('The routing service is unavailable right now. Try again in a moment.'); e.status = 502; throw e; }

  const candidates = ok
    .filter((c) => c.err / targetM <= TOLERANCE)
    .filter((c) => haversineM(c.coords[0], startPt) < 250 && haversineM(c.coords.at(-1), startPt) < 250) // must finish near start
    .map((c) => { const coords = thin(c.coords); return { bearing: c.bearing, distanceKm: +(c.distanceM / 1000).toFixed(2), coords, ...score(c.distanceM, targetM, coords, routeType) }; })
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) { const e = new Error(`Couldn't build a ${distanceKm} km ${routeType === 'LOOP' ? 'loop' : 'route'} from here. Try a different start point or distance.`); e.status = 422; throw e; }
  return candidates.slice(0, 3);
}
