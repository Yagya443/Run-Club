import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';

await connectDatabase();
app.listen(env.port, () => console.log(`Run Club API on :${env.port}`));
