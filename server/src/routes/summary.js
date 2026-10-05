import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../async.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const mealsByDate = db.prepare(`
  SELECT COALESCE(SUM(calories),0) AS calories,
         COALESCE(SUM(protein),0)  AS protein,
         COALESCE(SUM(carbs),0)    AS carbs,
         COALESCE(SUM(fat),0)      AS fat,
         COUNT(*)                  AS count
  FROM meals WHERE user_id = ? AND date = ?
`);
const workoutsCountByDate = db.prepare(
  'SELECT COUNT(*) AS count FROM workouts WHERE user_id = ? AND date = ?'
);
const activityByDate = db.prepare(
  'SELECT steps, distance_km, active_minutes FROM activity WHERE user_id = ? AND date = ?'
);

// Calories per day over a range (for charts).
const caloriesRange = db.prepare(`
  SELECT date, COALESCE(SUM(calories),0) AS calories
  FROM meals WHERE user_id = ? AND date >= ? GROUP BY date
`);
const stepsRange = db.prepare(
  'SELECT date, steps, active_minutes FROM activity WHERE user_id = ? AND date >= ?'
);
const workoutsRange = db.prepare(`
  SELECT date, COUNT(*) AS count
  FROM workouts WHERE user_id = ? AND date >= ? GROUP BY date
`);

// Timezone-safe calendar-date math: treat 'YYYY-MM-DD' as a pure date and
// shift it by whole days using UTC so no local-offset rollover can occur.
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Server's own local calendar date (fallback when the client doesn't send one).
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

// --- Streak + weekly report statements --------------------------------------
const mealDatesStmt = db.prepare(
  'SELECT DISTINCT date FROM meals WHERE user_id = ? ORDER BY date DESC'
);
const weekMealsStmt = db.prepare(`
  SELECT date,
         SUM(calories) AS calories,
         SUM(protein)  AS protein,
         SUM(carbs)    AS carbs,
         SUM(fat)      AS fat
  FROM meals WHERE user_id = ? AND date >= ? AND date <= ?
  GROUP BY date
`);
const weekWaterStmt = db.prepare(
  'SELECT date, water_ml FROM day_log WHERE user_id = ? AND date >= ? AND date <= ?'
);
const weightInRangeStmt = db.prepare(
  'SELECT date, weight FROM weight_logs WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC'
);
const weekActivityStmt = db.prepare(
  'SELECT steps, active_minutes FROM activity WHERE user_id = ? AND date >= ? AND date <= ?'
);
const weekWorkoutsStmt = db.prepare(
  'SELECT COUNT(*) AS count FROM workouts WHERE user_id = ? AND date >= ? AND date <= ?'
);

async function computeStreak(userId, todayISO) {
  const dates = new Set((await mealDatesStmt.all(userId)).map((r) => r.date));
  let streak = 0;
  // Allow the streak to count even if today isn't logged yet (start from yesterday).
  let cursor = dates.has(todayISO) ? todayISO : addDays(todayISO, -1);
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Longest run of consecutive logged days, ever.
async function computeBestStreak(userId) {
  const dates = (await mealDatesStmt.all(userId)).map((r) => r.date).sort(); // ascending
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of dates) {
    if (prev && addDays(prev, 1) === d) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

const mealCountByDateStmt = db.prepare(
  'SELECT date, COUNT(*) AS count FROM meals WHERE user_id = ? AND date >= ? GROUP BY date'
);

// GET /api/summary?date=YYYY-MM-DD  -> today's roll-up
router.get('/', ah(async (req, res) => {
  const date = req.query.date || localToday();
  const nutrition = await mealsByDate.get(req.user.id, date);
  const activity = (await activityByDate.get(req.user.id, date)) || {
    steps: 0,
    distance_km: 0,
    active_minutes: 0,
  };
  const workouts = await workoutsCountByDate.get(req.user.id, date);
  res.json({
    date,
    nutrition,
    activity,
    workouts: workouts.count,
    streak: await computeStreak(req.user.id, date),
    bestStreak: await computeBestStreak(req.user.id),
  });
}));

// GET /api/summary/calendar?days=35&end=YYYY-MM-DD -> per-day logged counts (heatmap)
router.get('/calendar', ah(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 35, 7), 180);
  const end = req.query.end || localToday();
  const since = addDays(end, -(days - 1));
  const counts = new Map(
    (await mealCountByDateStmt.all(req.user.id, since)).map((r) => [r.date, r.count])
  );
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(end, -i);
    out.push({ date: d, meals: counts.get(d) || 0 });
  }
  res.json(out);
}));

// GET /api/summary/week?end=YYYY-MM-DD -> 7-day nutrition report
router.get('/week', ah(async (req, res) => {
  const end = req.query.end || localToday();
  const start = addDays(end, -6);

  const meals = await weekMealsStmt.all(req.user.id, start, end);
  const daysLogged = meals.length;
  const totals = meals.reduce(
    (a, m) => ({
      calories: a.calories + (m.calories || 0),
      protein: a.protein + (m.protein || 0),
      carbs: a.carbs + (m.carbs || 0),
      fat: a.fat + (m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const divisor = daysLogged || 1;

  const water = await weekWaterStmt.all(req.user.id, start, end);
  const waterTotal = water.reduce((a, w) => a + (w.water_ml || 0), 0);

  const acts = await weekActivityStmt.all(req.user.id, start, end);
  const stepsTotal = acts.reduce((a, r) => a + (r.steps || 0), 0);
  const minutesTotal = acts.reduce((a, r) => a + (r.active_minutes || 0), 0);

  const workouts = (await weekWorkoutsStmt.get(req.user.id, start, end)).count;

  const weights = await weightInRangeStmt.all(req.user.id, start, end);
  const weightChange =
    weights.length >= 2 ? weights[weights.length - 1].weight - weights[0].weight : null;

  res.json({
    start,
    end,
    daysLogged,
    avg: {
      calories: totals.calories / divisor,
      protein: totals.protein / divisor,
      carbs: totals.carbs / divisor,
      fat: totals.fat / divisor,
      water_ml: water.length ? waterTotal / water.length : 0,
      steps: acts.length ? stepsTotal / acts.length : 0,
      active_minutes: acts.length ? minutesTotal / acts.length : 0,
    },
    totals,
    workouts,
    activeDays: acts.length,
    weightChange,
  });
}));

// GET /api/summary/trends?days=30 -> per-day series for charts
router.get('/trends', ah(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 365);
  const end = req.query.end || localToday();
  const since = addDays(end, -(days - 1));

  const cal = new Map((await caloriesRange.all(req.user.id, since)).map((r) => [r.date, r.calories]));
  const steps = new Map((await stepsRange.all(req.user.id, since)).map((r) => [r.date, r]));
  const wk = new Map((await workoutsRange.all(req.user.id, since)).map((r) => [r.date, r.count]));

  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const s = steps.get(date);
    series.push({
      date,
      calories: cal.get(date) || 0,
      steps: s ? s.steps : 0,
      active_minutes: s ? s.active_minutes : 0,
      workouts: wk.get(date) || 0,
    });
  }
  res.json(series);
}));

export default router;
