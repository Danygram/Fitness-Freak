import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(
  'SELECT * FROM meals WHERE user_id = ? ORDER BY date DESC, id DESC'
);
const listByDateStmt = db.prepare(
  'SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY id ASC'
);
const insertStmt = db.prepare(
  `INSERT INTO meals (user_id, date, name, meal_type, calories, protein, carbs, fat)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const getStmt = db.prepare('SELECT * FROM meals WHERE id = ? AND user_id = ?');
const updateStmt = db.prepare(
  `UPDATE meals SET date = ?, name = ?, meal_type = ?, calories = ?, protein = ?, carbs = ?, fat = ?
   WHERE id = ? AND user_id = ?`
);
const deleteStmt = db.prepare('DELETE FROM meals WHERE id = ? AND user_id = ?');

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

router.get('/', ah(async (req, res) => {
  const rows = req.query.date
    ? await listByDateStmt.all(req.user.id, req.query.date)
    : await listStmt.all(req.user.id);
  res.json(rows);
}));

router.post('/', ah(async (req, res) => {
  const { date, name, meal_type, calories, protein, carbs, fat } = req.body || {};
  if (!date || !name) {
    return res.status(400).json({ error: 'date and name are required' });
  }
  const result = await insertStmt.run(
    req.user.id,
    date,
    String(name).trim(),
    meal_type || 'other',
    num(calories),
    num(protein),
    num(carbs),
    num(fat)
  );
  res.status(201).json(await getStmt.get(Number(result.lastInsertRowid), req.user.id));
}));

router.put('/:id', ah(async (req, res) => {
  const existing = await getStmt.get(Number(req.params.id), req.user.id);
  if (!existing) return res.status(404).json({ error: 'Meal not found' });
  const b = req.body || {};
  await updateStmt.run(
    b.date ?? existing.date,
    b.name !== undefined ? String(b.name).trim() : existing.name,
    b.meal_type ?? existing.meal_type,
    b.calories !== undefined ? num(b.calories) : existing.calories,
    b.protein !== undefined ? num(b.protein) : existing.protein,
    b.carbs !== undefined ? num(b.carbs) : existing.carbs,
    b.fat !== undefined ? num(b.fat) : existing.fat,
    existing.id,
    req.user.id
  );
  res.json(await getStmt.get(existing.id, req.user.id));
}));

router.delete('/:id', ah(async (req, res) => {
  const result = await deleteStmt.run(Number(req.params.id), req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Meal not found' });
  res.json({ ok: true });
}));

export default router;
