import { z } from 'zod';
import { generateRoutes } from '../services/routeGenerationService.js';
import { geocode } from '../services/geocodeService.js';
import { saveRoute } from '../services/runPlanService.js';

const lat = z.number().min(-90).max(90), lng = z.number().min(-180).max(180);
const difficulty = z.enum(['EASY', 'MODERATE', 'CHALLENGING']).default('EASY');
const routeType = z.enum(['LOOP', 'OUT_AND_BACK']).default('LOOP'); // point-to-point needs a destination: later
export const generateSchema = z.object({
  start: z.object({ lat, lng }), distanceKm: z.number().min(1).max(42), routeType,
  environment: z.enum(['MIXED', 'GREENERY', 'PARKS', 'WATERFRONT', 'QUIET_ROADS', 'LANDMARKS']).default('MIXED'), difficulty,
});
export const saveSchema = z.object({
  start: z.object({ label: z.string().trim().min(1).max(200), lat, lng }), routeType, difficulty,
  geometry: z.array(z.tuple([lat, lng])).min(2).max(6000),
  scheduledAt: z.coerce.date().refine((d) => d.getTime() > Date.now() - 60_000, 'Pick a time in the future'),
});
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

export const generate = wrap(async (req, res) => {
  const { start, distanceKm, routeType } = req.body;
  // environment + difficulty are stored with the run but do not influence scoring yet (needs OSM land-use data).
  res.json({ candidates: await generateRoutes({ start, distanceKm, routeType }) });
});
export const search = wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json({ results: [] });
  res.json({ results: await geocode(q.slice(0, 120)) });
});
export const save = wrap(async (req, res) => res.status(201).json(await saveRoute(req.userId, req.body)));
