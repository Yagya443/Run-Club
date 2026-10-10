import { z } from 'zod';
import * as auth from '../services/authService.js';
import * as dash from '../services/dashboardService.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(100),
});
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(100) });

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
export const register = wrap(async (req, res) => res.status(201).json(await auth.register(req.body)));
export const login = wrap(async (req, res) => res.json(await auth.login(req.body)));
export const me = wrap(async (req, res) => res.json({ user: await auth.me(req.userId) }));
export const dashboard = wrap(async (req, res) => res.json(await dash.getDashboard(req.userId)));
