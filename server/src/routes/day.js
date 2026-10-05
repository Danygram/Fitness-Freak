import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const getStmt = db.prepare('SELECT * FROM day_log WHERE user_id = ? AND date = ?');
const upsertStmt = db.prepare(`
  INSERT INTO day_log (user_id, date, water_ml, habits)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id, date) DO UPDATE SET
    water_ml = excluded.water_ml,
    habits = excluded.habits
`);

function serialize(row, date) {
  if (!row) return { date, water_ml: 0, habits: [] };
  let habits = [];
  try {
    habits = JSON.parse(row.habits || '[]');
  } catch {
    habits = [];
  }
  return { date: row.date, water_ml: row.water_ml, habits };
}

router.get('/', ah(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(serialize(await getStmt.get(req.user.id, date), date));
}));

// Partial upsert: send any of { water_ml, habits } along with date.
router.put('/', ah(async (req, res) => {
  const { date } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date is required' });
  const existing = serialize(await getStmt.get(req.user.id, date), date);

  const water_ml =
    req.body.water_ml !== undefined
      ? Math.max(0, Math.round(Number(req.body.water_ml) || 0))
      : existing.water_ml;
  const habits = Array.isArray(req.body.habits) ? req.body.habits : existing.habits;

  await upsertStmt.run(req.user.id, date, water_ml, JSON.stringify(habits));
  res.json(serialize(await getStmt.get(req.user.id, date), date));
}));

export default router;
