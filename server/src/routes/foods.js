import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(
  'SELECT * FROM foods WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC'
);
const insertStmt = db.prepare(
  'INSERT INTO foods (user_id, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)'
);
const getStmt = db.prepare('SELECT * FROM foods WHERE id = ? AND user_id = ?');
const deleteStmt = db.prepare('DELETE FROM foods WHERE id = ? AND user_id = ?');

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// --- Food database search (OpenFoodFacts proxy) -----------------------------
// Server-side so we avoid browser CORS, can send a proper User-Agent, and
// normalize the messy nutriment fields into clean per-100g numbers.
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?' +
    new URLSearchParams({
      search_terms: q,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '20',
      fields: 'product_name,brands,nutriments,serving_size',
    }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FitnessFreak/1.0 (fitness tracker; dev)' },
    });
    if (!r.ok) throw new Error(`OFF responded ${r.status}`);
    const data = await r.json();
    const results = (data.products || [])
      .map((p) => {
        const n = p.nutriments || {};
        const name = (p.product_name || '').trim();
        const cal = num(n['energy-kcal_100g'] ?? n['energy-kcal']);
        if (!name || cal <= 0) return null;
        return {
          name,
          brand: (p.brands || '').split(',')[0].trim(),
          serving: p.serving_size || '',
          // all per 100 g
          calories: Math.round(cal),
          protein: Math.round(num(n.proteins_100g) * 10) / 10,
          carbs: Math.round(num(n.carbohydrates_100g) * 10) / 10,
          fat: Math.round(num(n.fat_100g) * 10) / 10,
        };
      })
      .filter(Boolean)
      .slice(0, 15);
    res.json(results);
  } catch (err) {
    const aborted = err.name === 'AbortError';
    res.status(aborted ? 504 : 502).json({
      error: aborted ? 'Food search timed out — try again.' : 'Food search is unavailable right now.',
    });
  } finally {
    clearTimeout(timeout);
  }
});

router.get('/', ah(async (req, res) => {
  res.json(await listStmt.all(req.user.id));
}));

router.post('/', ah(async (req, res) => {
  const { name, calories, protein, carbs, fat } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const result = await insertStmt.run(
    req.user.id,
    String(name).trim(),
    num(calories),
    num(protein),
    num(carbs),
    num(fat)
  );
  res.status(201).json(await getStmt.get(Number(result.lastInsertRowid), req.user.id));
}));

router.delete('/:id', ah(async (req, res) => {
  const result = await deleteStmt.run(Number(req.params.id), req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Food not found' });
  res.json({ ok: true });
}));

export default router;
