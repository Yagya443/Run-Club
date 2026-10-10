import { z } from 'zod';
import * as runs from '../services/runService.js';
import * as clubs from '../services/clubService.js';
import * as prof from '../services/profileService.js';

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const ok = (res) => res.json({ ok: true });
export const clubSchema = z.object({ name: z.string().trim().min(3, 'Name needs at least 3 characters').max(60), description: z.string().trim().max(300).default('') });
export const commentSchema = z.object({ body: z.string().trim().min(1).max(500) });
export const visibilitySchema = z.object({ visibility: z.enum(['PUBLIC', 'PRIVATE']) });
export const profileSchema = z.object({ name: z.string().trim().min(2).max(60), bio: z.string().trim().max(240).default(''),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']), preferredDistanceKm: z.number().min(1).max(100),
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(), paceSecPerKm: z.number().int().min(180).max(720).nullable() });

const num = (v) => (v === undefined || v === '' ? null : Number(v));
export const discover = wrap(async (req, res) => { const lat = num(req.query.lat), lng = num(req.query.lng);
  res.json({ runs: await runs.discover(req.userId, Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}) }); });
export const getRun = wrap(async (req, res) => res.json({ run: await runs.getRun(req.userId, req.params.id) }));
export const joinRun = wrap(async (req, res) => { await runs.join(req.userId, req.params.id); ok(res); });
export const leaveRun = wrap(async (req, res) => { await runs.leave(req.userId, req.params.id); ok(res); });
export const visibility = wrap(async (req, res) => { await runs.setVisibility(req.userId, req.params.id, req.body.visibility); ok(res); });
export const giveKudos = wrap(async (req, res) => { await runs.kudos(req.userId, req.params.id, true); ok(res); });
export const removeKudos = wrap(async (req, res) => { await runs.kudos(req.userId, req.params.id, false); ok(res); });
export const comment = wrap(async (req, res) => { await runs.addComment(req.userId, req.params.id, req.body.body); res.status(201).json({ ok: true }); });
export const delComment = wrap(async (req, res) => { await runs.deleteComment(req.userId, req.params.cid); ok(res); });
export const listClubs = wrap(async (req, res) => res.json({ clubs: await clubs.list(req.userId, String(req.query.q || '').slice(0, 60)) }));
export const createClub = wrap(async (req, res) => res.status(201).json(await clubs.create(req.userId, req.body)));
export const getClub = wrap(async (req, res) => res.json({ club: await clubs.get(req.userId, req.params.id) }));
export const joinClub = wrap(async (req, res) => { await clubs.join(req.userId, req.params.id); ok(res); });
export const leaveClub = wrap(async (req, res) => { await clubs.leave(req.userId, req.params.id); ok(res); });
export const getProfile = wrap(async (req, res) => res.json({ profile: await prof.getProfile(req.userId, req.params.id === 'me' ? req.userId : req.params.id) }));
export const updateProfile = wrap(async (req, res) => { await prof.updateProfile(req.userId, req.body); ok(res); });
export const follow = wrap(async (req, res) => { await prof.follow(req.userId, req.params.id, true); ok(res); });
export const unfollow = wrap(async (req, res) => { await prof.follow(req.userId, req.params.id, false); ok(res); });
