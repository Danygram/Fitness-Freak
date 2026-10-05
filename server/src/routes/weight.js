import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(
  'SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date ASC'
);
const upsertStmt = db.prepare(`
  INSERT INTO weight_logs (user_id, date, weight)
  VALUES (?, ?, ?)
  ON CONFLICT(user_id, date) DO UPDATE SET weight = excluded.weight
`);
const getByDateStmt = db.prepare(
  'SELECT * FROM weight_logs WHERE user_id = ? AND date = ?'
);
const deleteStmt = db.prepare('DELETE FROM weight_logs WHERE id = ? AND user_id = ?');

router.get('/', ah(async (req, res) => {
  res.json(await listStmt.all(req.user.id));
}));

router.put('/', ah(async (req, res) => {
  const { date, weight } = req.body || {};
  if (!date || !Number.isFinite(Number(weight))) {
    return res.status(400).json({ error: 'date and numeric weight are required' });
  }
  await upsertStmt.run(req.user.id, date, Number(weight));
  res.json(await getByDateStmt.get(req.user.id, date));
}));

router.delete('/:id', ah(async (req, res) => {
  const result = await deleteStmt.run(Number(req.params.id), req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
}));

export default router;
