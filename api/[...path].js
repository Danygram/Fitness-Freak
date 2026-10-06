// Vercel serverless function: handles every /api/* request with the Express app.
// The DB schema is initialized once per warm instance (cached in `ready`).
import app from '../server/src/app.js';
import { initDb } from '../server/src/db.js';

let ready;

export default async function handler(req, res) {
  if (!ready) ready = initDb();
  await ready;
  return app(req, res);
}
