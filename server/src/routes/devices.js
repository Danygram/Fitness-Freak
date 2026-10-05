import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC');
const insertStmt = db.prepare(
  `INSERT INTO devices (user_id, name, type, battery, connected, last_synced)
   VALUES (?, ?, ?, ?, ?, datetime('now'))`
);
const getStmt = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?');
const updateStmt = db.prepare(
  'UPDATE devices SET name = ?, type = ?, battery = ?, connected = ? WHERE id = ? AND user_id = ?'
);
const syncStmt = db.prepare(
  "UPDATE devices SET last_synced = datetime('now'), connected = 1, battery = ? WHERE id = ? AND user_id = ?"
);
const deleteStmt = db.prepare('DELETE FROM devices WHERE id = ? AND user_id = ?');

const clampBattery = (v) => Math.max(0, Math.min(100, Math.round(Number(v)) || 0));

router.get('/', ah(async (req, res) => {
  res.json(await listStmt.all(req.user.id));
}));

router.post('/', ah(async (req, res) => {
  const { name, type, battery, connected } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const result = await insertStmt.run(
    req.user.id,
    String(name).trim(),
    type ? String(type) : 'other',
    battery === undefined ? 100 : clampBattery(battery),
    connected === false ? 0 : 1
  );
  res.status(201).json(await getStmt.get(Number(result.lastInsertRowid), req.user.id));
}));

router.put('/:id', ah(async (req, res) => {
  const existing = await getStmt.get(Number(req.params.id), req.user.id);
  if (!existing) return res.status(404).json({ error: 'Device not found' });
  const b = req.body || {};
  await updateStmt.run(
    b.name !== undefined ? String(b.name).trim() : existing.name,
    b.type !== undefined ? String(b.type) : existing.type,
    b.battery !== undefined ? clampBattery(b.battery) : existing.battery,
    b.connected !== undefined ? (b.connected ? 1 : 0) : existing.connected,
    existing.id,
    req.user.id
  );
  res.json(await getStmt.get(existing.id, req.user.id));
}));

// Simulate a sync: refresh the timestamp, mark connected, nudge battery down a touch.
router.post('/:id/sync', ah(async (req, res) => {
  const existing = await getStmt.get(Number(req.params.id), req.user.id);
  if (!existing) return res.status(404).json({ error: 'Device not found' });
  const nextBattery = Math.max(1, existing.battery - Math.floor(Math.random() * 3));
  await syncStmt.run(nextBattery, existing.id, req.user.id);
  res.json(await getStmt.get(existing.id, req.user.id));
}));

router.delete('/:id', ah(async (req, res) => {
  const result = await deleteStmt.run(Number(req.params.id), req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Device not found' });
  res.json({ ok: true });
}));

export default router;
