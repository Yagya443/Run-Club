// Offline check of the generation algorithm using a fake router (straight lines x1.3). Not a substitute for real routing.
import { generateRoutes } from './src/services/routeGenerationService.js';
import { pathLengthM } from './src/services/geo.js';
const fake = async (w) => { const coords = w.flatMap((p, i) => i ? [p] : [p]); return { distanceM: pathLengthM(coords) * 1.3, coords }; };
for (const [t, km] of [['LOOP', 5], ['LOOP', 10], ['OUT_AND_BACK', 7]]) {
  const r = await generateRoutes({ start: { lat: 19.4559, lng: 72.7925 }, distanceKm: km, routeType: t }, fake);
  console.log(t, km, '->', r.map((c) => `${c.distanceKm}km s${c.score}`).join(', '));
}
