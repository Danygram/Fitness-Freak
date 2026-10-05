import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(
  'SELECT * FROM activity WHERE user_id = ? ORDER BY date DESC'
);
const getByDateStmt = db.prepare(
  'SELECT * FROM activity WHERE user_id = ? AND date = ?'
);
const upsertStmt = db.prepare(`
  INSERT INTO activity (user_id, date, steps, distance_km, active_minutes)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id, date) DO UPDATE SET
    steps = excluded.steps,
    distance_km = excluded.distance_km,
    active_minutes = excluded.active_minutes
`);

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

router.get('/', ah(async (req, res) => {
  if (req.query.date) {
    const row = await getByDateStmt.get(req.user.id, req.query.date);
    return res.json(row || null);
  }
  res.json(await listStmt.all(req.user.id));
}));

// Upsert a day's activity.
router.put('/', ah(async (req, res) => {
  const { date, steps, distance_km, active_minutes } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date is required' });
  await upsertStmt.run(
    req.user.id,
    date,
    Math.round(num(steps)),
    num(distance_km),
    Math.round(num(active_minutes))
  );
  res.json(await getByDateStmt.get(req.user.id, date));
}));

export default router;
