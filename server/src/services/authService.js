import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, RunnerPreference } from '../models/index.js';
import { env } from '../config/env.js';

// Never return passwordHash or anything beyond what the owner needs.
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, bio: u.bio, photoUrl: u.photoUrl });
const sign = (u) => jwt.sign({ sub: u.id }, env.jwtSecret, { expiresIn: env.jwtExpires });

export async function register({ name, email, password }) {
  const exists = await User.findOne({ email });
  if (exists) { const e = new Error('An account with this email already exists.'); e.status = 409; throw e; }
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  await RunnerPreference.create({ userId: user.id });
  return { token: sign(user), user: publicUser(user) };
}
export async function login({ email, password }) {
  const user = await User.findOne({ email });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) { const e = new Error('Email or password is incorrect.'); e.status = 401; throw e; }
  return { token: sign(user), user: publicUser(user) };
}
export async function me(id) {
  const user = await User.findById(id).lean();
  if (!user) { const e = new Error('Account not found.'); e.status = 404; throw e; }
  const preference = await RunnerPreference.findOne({ userId: id }).lean();
  return { ...publicUser({ ...user, id: user._id }), preference };
}
