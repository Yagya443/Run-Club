const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const k of required) if (!process.env[k]) { console.error(`Missing env var ${k}. Copy server/.env.example to server/.env`); process.exit(1); }
if (process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') { console.error('JWT_SECRET must be at least 32 characters in production.'); process.exit(1); }
  console.warn('Warning: JWT_SECRET is short. Use 32+ random characters (openssl rand -hex 32).');
}
export const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: process.env.JWT_EXPIRES_IN || '7d',
};
