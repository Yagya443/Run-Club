// Boots the real Express app (no database) and checks auth, validation, headers and limits.
process.env.DATABASE_URL = 'mongodb://127.0.0.1:27017/runclub?replicaSet=rs0'; process.env.JWT_SECRET = 'test-secret-'.padEnd(40, 'x');
import assert from 'node:assert';
const { default: app } = await import('./src/app.js');
const { default: jwt } = await import('jsonwebtoken');
const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}/api`;
const tok = jwt.sign({ sub: 'u1' }, process.env.JWT_SECRET, { expiresIn: '1h' }), expired = jwt.sign({ sub: 'u1' }, process.env.JWT_SECRET, { expiresIn: -10 });
const call = (m, p, body, t) => fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

ok((await call('GET', '/health')).status === 200, 'health');
ok((await call('GET', '/nope')).status === 404, '404');
const h = (await call('GET', '/health')).headers; ok(h.get('x-content-type-options') === 'nosniff' && !h.get('x-powered-by'), 'security headers');

const protectedRoutes = [['GET', '/dashboard'], ['GET', '/auth/me'], ['GET', '/stats'], ['GET', '/runs/discover'], ['GET', '/runs/abc'], ['GET', '/clubs'], ['GET', '/clubs/abc'], ['GET', '/users/me'], ['GET', '/geocode?q=abc'],
  ['GET', '/runners/nearby'], ['GET', '/ai/status'], ['POST', '/runs/abc/join', {}], ['POST', '/runs/abc/leave', {}], ['POST', '/runs/abc/start', {}], ['POST', '/runs/abc/complete', {}], ['POST', '/runs/abc/discard', {}],
  ['POST', '/runs/abc/reflection', {}], ['POST', '/runs/abc/kudos', {}], ['POST', '/runs/abc/comments', {}], ['DELETE', '/runs/abc/comments/c'], ['PUT', '/runs/abc/visibility', {}], ['POST', '/routes/generate', {}],
  ['POST', '/routes/save', {}], ['POST', '/runners/match', {}], ['POST', '/runs/plan', {}], ['POST', '/runs/create', {}], ['POST', '/clubs', {}], ['POST', '/clubs/abc/join', {}], ['PUT', '/me/profile', {}], ['POST', '/users/abc/follow', {}]];
for (const [m, p, b] of protectedRoutes) {
  ok((await call(m, p, b)).status === 401, `${m} ${p} needs auth`);
  ok((await call(m, p, b, expired)).status === 401, `${m} ${p} rejects expired token`);
}
const bad = [['POST', '/routes/generate', { start: { lat: 99, lng: 0 }, distanceKm: 5 }], ['POST', '/routes/generate', { start: { lat: 1, lng: 1 }, distanceKm: 100 }],
  ['POST', '/runners/match', { start: { lat: 1, lng: 1 }, date: 'tomorrow', time: '06:30', distanceKm: 5, level: 'BEGINNER' }], ['POST', '/runs/abc/complete', { durationSec: 5, distanceM: 10, source: 'GPS' }],
  ['POST', '/clubs', { name: 'a' }], ['POST', '/runs/abc/comments', { body: '' }], ['PUT', '/me/profile', { name: 'x', level: 'GOD' }], ['PUT', '/runs/abc/visibility', { visibility: 'MAYBE' }],
  ['POST', '/runs/create', { title: 'x' }], ['POST', '/runs/abc/reflection', { text: '' }]];
for (const [m, p, b] of bad) { const r = await call(m, p, b, tok); ok(r.status === 400, `${m} ${p} validates input (got ${r.status})`); }
ok((await call('POST', '/auth/register', { name: 'A', email: 'nope', password: '123' })).status === 400, 'register validation');
ok((await call('POST', '/auth/login', { email: 'nope', password: 'x' })).status === 400, 'login validation');
ok((await call('POST', '/auth/login', '{bad json')).status === 400, 'bad JSON');
ok((await call('POST', '/auth/login', { email: 'a@b.co', password: 'x'.repeat(400000) })).status === 413, 'oversized body');
server.close(); console.log(`smoke test passed (${n} checks): all routes require auth, inputs are validated, headers and limits hold`); process.exit(0);
