import mongoose from 'mongoose';

export async function connectDatabase(uri = process.env.DATABASE_URL) {
  if (!uri) throw new Error('Missing DATABASE_URL. Set it to your MongoDB connection string.');
  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
