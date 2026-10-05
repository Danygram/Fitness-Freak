import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(
  'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, id DESC'
);
const listByDateStmt = db.prepare(
  'SELECT * FROM workouts WHERE user_id = ? AND date = ? ORDER BY id DESC'
);
const insertStmt = db.prepare(
  'INSERT INTO workouts (user_id, date, name, notes, exercises) VALUES (?, ?, ?, ?, ?)'
);
const getStmt = db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?');
const updateStmt = db.prepare(
  'UPDATE workouts SET date = ?, name = ?, notes = ?, exercises = ? WHERE id = ? AND user_id = ?'
);
const deleteStmt = db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?');

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
  const rows = req.query.date
    ? await listByDateStmt.all(req.user.id, req.query.date)
    : await listStmt.all(req.user.id);
  res.json(rows.map(serialize));
}));

router.post('/', ah(async (req, res) => {
  const { date, name, notes, exercises } = req.body || {};
  if (!date || !name) {
    return res.status(400).json({ error: 'date and name are required' });
  }
  const result = await insertStmt.run(
    req.user.id,
    date,
    String(name).trim(),
    notes ? String(notes) : null,
    JSON.stringify(Array.isArray(exercises) ? exercises : [])
  );
  res.status(201).json(serialize(await getStmt.get(Number(result.lastInsertRowid), req.user.id)));
}));

router.put('/:id', ah(async (req, res) => {
  const existing = await getStmt.get(Number(req.params.id), req.user.id);
  if (!existing) return res.status(404).json({ error: 'Workout not found' });
  const { date, name, notes, exercises } = req.body || {};
  await updateStmt.run(
    date ?? existing.date,
    name ? String(name).trim() : existing.name,
    notes !== undefined ? notes : existing.notes,
    JSON.stringify(Array.isArray(exercises) ? exercises : serialize(existing).exercises),
    existing.id,
    req.user.id
  );
  res.json(serialize(await getStmt.get(existing.id, req.user.id)));
}));

router.delete('/:id', ah(async (req, res) => {
  const result = await deleteStmt.run(Number(req.params.id), req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Workout not found' });
  res.json({ ok: true });
}));

export default router;
