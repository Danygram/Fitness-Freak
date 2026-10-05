import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const getStmt = db.prepare('SELECT * FROM settings WHERE user_id = ?');
const insertStmt = db.prepare('INSERT INTO settings (user_id) VALUES (?)');
const updateStmt = db.prepare(`
  UPDATE settings SET
    calorie_target = ?, protein_target = ?, carbs_target = ?, fat_target = ?,
    water_target_ml = ?, step_target = ?, start_weight = ?, goal_weight = ?,
    updated_at = datetime('now')
  WHERE user_id = ?
`);

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

async function ensure(userId) {
  let row = await getStmt.get(userId);
  if (!row) {
    await insertStmt.run(userId);
    row = await getStmt.get(userId);
  }
  return row;
}

router.get('/', ah(async (req, res) => {
  res.json(await ensure(req.user.id));
}));

router.put('/', ah(async (req, res) => {
  const current = await ensure(req.user.id);
  const b = req.body || {};
  await updateStmt.run(
    num(b.calorie_target, current.calorie_target),
    num(b.protein_target, current.protein_target),
    num(b.carbs_target, current.carbs_target),
    num(b.fat_target, current.fat_target),
    Math.round(num(b.water_target_ml, current.water_target_ml)),
    Math.round(num(b.step_target, current.step_target)),
    b.start_weight === undefined || b.start_weight === null || b.start_weight === ''
      ? current.start_weight
      : num(b.start_weight),
    b.goal_weight === undefined || b.goal_weight === null || b.goal_weight === ''
      ? current.goal_weight
      : num(b.goal_weight),
    req.user.id
  );
  if (b.onboarded === true) {
    await db.prepare('UPDATE settings SET onboarded = 1 WHERE user_id = ?').run(req.user.id);
  }
  res.json(await getStmt.get(req.user.id));
}));

export default router;
