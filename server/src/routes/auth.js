import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import {
  hashPassword,
  verifyPassword,
  createToken,
  requireAuth,
} from '../auth.js';

const router = Router();

const insertUser = db.prepare(
  'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
);
const userByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const userById = db.prepare('SELECT * FROM users WHERE id = ?');
const createSettings = db.prepare('INSERT OR IGNORE INTO settings (user_id) VALUES (?)');
const onboardedStmt = db.prepare('SELECT onboarded FROM settings WHERE user_id = ?');
const updateProfileStmt = db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?');
const updatePasswordStmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');

// Tables that hold rows owned by a user — deleted explicitly on account removal
// (we don't rely on ON DELETE CASCADE, which isn't guaranteed on remote libSQL).
const USER_TABLES = [
  'workouts', 'meals', 'activity', 'goals', 'settings', 'weight_logs',
  'foods', 'day_log', 'integrations', 'devices', 'sessions', 'workout_templates',
];

async function onboardedFor(userId) {
  const row = await onboardedStmt.get(userId);
  return row ? !!row.onboarded : false;
}

async function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, onboarded: await onboardedFor(u.id) };
}

router.post('/register', ah(async (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'email, name and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (await userByEmail.get(normalizedEmail)) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }
  const result = await insertUser.run(
    normalizedEmail,
    String(name).trim(),
    hashPassword(String(password))
  );
  const userId = Number(result.lastInsertRowid);
  await createSettings.run(userId); // settings row (onboarded defaults to 0)
  const token = createToken(userId);
  res.status(201).json({
    token,
    user: { id: userId, email: normalizedEmail, name: String(name).trim(), onboarded: false },
  });
}));

router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = await userByEmail.get(String(email).trim().toLowerCase());
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  await createSettings.run(user.id);
  const token = createToken(user.id);
  res.json({ token, user: await publicUser(user) });
}));

router.get('/me', requireAuth, ah(async (req, res) => {
  res.json({ user: await publicUser(req.user) });
}));

// --- Account management ------------------------------------------------------
router.patch('/profile', requireAuth, ah(async (req, res) => {
  const { name, email } = req.body || {};
  const current = await userById.get(req.user.id);
  const nextName = name !== undefined && String(name).trim() ? String(name).trim() : current.name;
  let nextEmail = current.email;
  if (email !== undefined && String(email).trim()) {
    nextEmail = String(email).trim().toLowerCase();
    const clash = await userByEmail.get(nextEmail);
    if (clash && clash.id !== current.id) {
      return res.status(409).json({ error: 'That email is already in use' });
    }
  }
  await updateProfileStmt.run(nextName, nextEmail, current.id);
  res.json({ user: await publicUser(await userById.get(current.id)) });
}));

router.post('/password', requireAuth, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = await userById.get(req.user.id);
  if (!verifyPassword(String(currentPassword), user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  await updatePasswordStmt.run(hashPassword(String(newPassword)), user.id);
  res.json({ ok: true });
}));

// Full data export (everything belonging to this user).
router.get('/export', requireAuth, ah(async (req, res) => {
  const uid = req.user.id;
  const all = (sql) => db.prepare(sql).all(uid);
  const data = {
    exportedAt: new Date().toISOString(),
    account: await publicUser(req.user),
    settings: (await db.prepare('SELECT * FROM settings WHERE user_id = ?').get(uid)) || null,
    meals: await all('SELECT * FROM meals WHERE user_id = ? ORDER BY date'),
    weight_logs: await all('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date'),
    activity: await all('SELECT * FROM activity WHERE user_id = ? ORDER BY date'),
    workouts: await all('SELECT * FROM workouts WHERE user_id = ? ORDER BY date'),
    goals: await all('SELECT * FROM goals WHERE user_id = ?'),
    foods: await all('SELECT * FROM foods WHERE user_id = ?'),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="fitness-freak-export.json"');
  res.json(data);
}));

router.delete('/account', requireAuth, ah(async (req, res) => {
  const { password } = req.body || {};
  const user = await userById.get(req.user.id);
  if (!password || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Password is incorrect' });
  }
  for (const table of USER_TABLES) {
    await db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(user.id);
  }
  await db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  res.json({ ok: true });
}));

export default router;
