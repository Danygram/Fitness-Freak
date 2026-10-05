import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(
  'SELECT * FROM workout_templates WHERE user_id = ? ORDER BY created_at DESC'
);
const insertStmt = db.prepare(
  'INSERT INTO workout_templates (user_id, name, exercises) VALUES (?, ?, ?)'
);
const getStmt = db.prepare('SELECT * FROM workout_templates WHERE id = ? AND user_id = ?');
const deleteStmt = db.prepare('DELETE FROM workout_templates WHERE id = ? AND user_id = ?');

function serialize(row) {
  let exercises = [];
  try {
    exercises = JSON.parse(row.exercises || '[]');
  } catch {
    exercises = [];
  }
  return { ...row, exercises };
}

router.get('/', ah(async (req, res) => {
  res.json((await listStmt.all(req.user.id)).map(serialize));
}));

router.post('/', ah(async (req, res) => {
  const { name, exercises } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const result = await insertStmt.run(
    req.user.id,
    String(name).trim(),
    JSON.stringify(Array.isArray(exercises) ? exercises : [])
  );
  res.status(201).json(serialize(await getStmt.get(Number(result.lastInsertRowid), req.user.id)));
}));

router.delete('/:id', ah(async (req, res) => {
  const result = await deleteStmt.run(Number(req.params.id), req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Template not found' });
  res.json({ ok: true });
}));

export default router;
