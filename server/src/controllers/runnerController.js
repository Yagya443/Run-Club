import { z } from 'zod';
import { findCandidates, saveAvailability } from '../services/matchingService.js';
import { explainMatches } from '../services/ai/runnerMatchAIService.js';
import { aiStatus } from '../services/ai/ollamaClient.js';
import { planGroup, createGroupRun } from '../services/groupRunService.js';
import { generateSchema } from './routeController.js';

const lat = z.number().min(-90).max(90), lng = z.number().min(-180).max(180);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const level = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

export const matchSchema = z.object({ start: z.object({ lat, lng, label: z.string().max(200).optional() }), date, time, distanceKm: z.number().min(1).max(42),
  level, paceSecPerKm: z.number().int().min(180).max(720).nullable().default(null), radiusKm: z.number().min(1).max(15).default(5) });
export const planSchema = z.object({ start: z.object({ label: z.string().max(200), lat, lng }), date, time, distanceKm: z.number().min(1).max(42),
  routeType: generateSchema.shape.routeType, difficulty: generateSchema.shape.difficulty, environment: generateSchema.shape.environment, runnerIds: z.array(z.string()).max(7).default([]) });
export const createSchema = z.object({ date, title: z.string().trim().min(3).max(80), description: z.string().trim().max(400).default(''),
  scheduledAt: z.coerce.date().refine((d) => d.getTime() > Date.now() - 60_000, 'Pick a time in the future'),
  routeType: generateSchema.shape.routeType, difficulty: generateSchema.shape.difficulty,
  meetingPoint: z.object({ label: z.string().min(1).max(200), lat, lng }), geometry: z.array(z.tuple([lat, lng])).min(2).max(6000),
  clubId: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  runners: z.array(z.object({ userId: z.string(), score: z.number().int().min(0).max(100), reason: z.string().max(220) })).max(7).default([]) });

// Deterministic discovery only (no AI). Query: lat,lng,date,time,distanceKm,level,radiusKm.
export const nearby = wrap(async (req, res) => {
  const q = matchSchema.parse({ start: { lat: +req.query.lat, lng: +req.query.lng }, date: req.query.date, time: req.query.time, distanceKm: +req.query.distanceKm,
    level: req.query.level || 'BEGINNER', paceSecPerKm: req.query.pace ? +req.query.pace : null, radiusKm: req.query.radiusKm ? +req.query.radiusKm : 5 });
  res.json({ matches: await findCandidates(req.userId, q) });
});
export const match = wrap(async (req, res) => {
  const me = req.body;
  await saveAvailability(req.userId, me, me.start.label);
  const found = await findCandidates(req.userId, me);
  res.json(await explainMatches({ me, matches: found }));
});
export const plan = wrap(async (req, res) => res.json(await planGroup(req.body)));
export const create = wrap(async (req, res) => res.status(201).json(await createGroupRun(req.userId, req.body)));
export const status = wrap(async (_req, res) => res.json(await aiStatus()));
