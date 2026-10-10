import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try { req.userId = jwt.verify(token, env.jwtSecret).sub; next(); }
  catch { res.status(401).json({ error: 'Your session expired. Sign in again.' }); }
}
