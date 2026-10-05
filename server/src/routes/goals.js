import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC');
const insertStmt = db.prepare(
  'INSERT INTO goals (user_id, type, title, target, current, unit) VALUES (?, ?, ?, ?, ?, ?)'
);
const getStmt = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?');
const updateStmt = db.prepare(
  'UPDATE goals SET type = ?, title = ?, target = ?, current = ?, unit = ? WHERE id = ? AND user_id = ?'
);
const deleteStmt = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?');

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

router.get('/', ah(async (req, res) => {
  res.json(await listStmt.all(req.user.id));
}));

router.post('/', ah(async (req, res) => {
  const { type, title, target, current, unit } = req.body || {};
  if (!title || target === undefined) {
    return res.status(400).json({ error: 'title and target are required' });
  }
  const result = await insertStmt.run(
    req.user.id,
    type || 'custom',
    String(title).trim(),
    num(target),
    num(current),
    unit ? String(unit) : ''
  );
  res.status(201).json(await getStmt.get(Number(result.lastInsertRowid), req.user.id));
}));

router.put('/:id', ah(async (req, res) => {
  const existing = await getStmt.get(Number(req.params.id), req.user.id);
  if (!existing) return res.status(404).json({ error: 'Goal not found' });
  const { type, title, target, current, unit } = req.body || {};
  await updateStmt.run(
    type ?? existing.type,
    title ? String(title).trim() : existing.title,
    target !== undefined ? num(target) : existing.target,
    current !== undefined ? num(current) : existing.current,
    unit !== undefined ? String(unit) : existing.unit,
    existing.id,
    req.user.id
  );
  res.json(await getStmt.get(existing.id, req.user.id));
}));

router.delete('/:id', ah(async (req, res) => {
  const result = await deleteStmt.run(Number(req.params.id), req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Goal not found' });
  res.json({ ok: true });
}));

export default router;
