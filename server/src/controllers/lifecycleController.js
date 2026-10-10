import { z } from 'zod';
import * as life from '../services/runLifecycleService.js';

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
export const completeSchema = z.object({ durationSec: z.number().int().min(60).max(86400), distanceM: z.number().int().min(100).max(100000), source: z.enum(['GPS', 'PLANNED']) });
export const reflectionSchema = z.object({ text: z.string().trim().min(3, 'Write a few words about the run').max(1000) });
export const startSchema = z.object({ startedAt: z.coerce.date().optional() });
export const start = wrap(async (req, res) => res.json(await life.start(req.userId, req.params.id, req.body.startedAt)));
export const complete = wrap(async (req, res) => { await life.complete(req.userId, req.params.id, req.body); res.json({ ok: true }); });
export const discard = wrap(async (req, res) => { await life.discard(req.userId, req.params.id); res.json({ ok: true }); });
export const reflection = wrap(async (req, res) => res.json({ reflection: await life.addReflection(req.userId, req.params.id, req.body.text) }));
export const stats = wrap(async (req, res) => res.json(await life.stats(req.userId)));
