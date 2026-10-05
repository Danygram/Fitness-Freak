import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(
  'SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC, id DESC'
);
const insertStmt = db.prepare(
  `INSERT INTO sessions (user_id, type, title, date, duration_sec, distance_km, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const getStmt = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?');
const deleteStmt = db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?');

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const TYPES = ['walk', 'run', 'ride', 'hike'];

router.get('/', ah(async (req, res) => {
  res.json(await listStmt.all(req.user.id));
}));

router.post('/', ah(async (req, res) => {
  const { type, title, date, duration_sec, distance_km, notes } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date is required' });
  const result = await insertStmt.run(
    req.user.id,
    TYPES.includes(type) ? type : 'walk',
    title ? String(title).trim() : null,
    date,
    Math.max(0, Math.round(num(duration_sec))),
    Math.max(0, num(distance_km)),
    notes ? String(notes) : null
  );
  res.status(201).json(await getStmt.get(Number(result.lastInsertRowid), req.user.id));
}));

router.delete('/:id', ah(async (req, res) => {
  const result = await deleteStmt.run(Number(req.params.id), req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Activity not found' });
  res.json({ ok: true });
}));

export default router;
