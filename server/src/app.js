import './env.js'; // MUST be first: loads .env before db.js/routes read process.env
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import workoutRoutes from './routes/workouts.js';
import mealRoutes from './routes/meals.js';
import activityRoutes from './routes/activity.js';
import goalRoutes from './routes/goals.js';
import summaryRoutes from './routes/summary.js';
import settingsRoutes from './routes/settings.js';
import weightRoutes from './routes/weight.js';
import foodRoutes from './routes/foods.js';
import dayRoutes from './routes/day.js';
import workoutTemplateRoutes from './routes/workoutTemplates.js';
import sessionRoutes from './routes/sessions.js';
import deviceRoutes from './routes/devices.js';
import integrationRoutes from './routes/integrations.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'fitness-freak' }));

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/day', dayRoutes);
app.use('/api/workout-templates', workoutTemplateRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/integrations', integrationRoutes);

// --- Serve the built frontend (single-service deploy: local dev / Render) ----
// On Vercel this block is skipped (the CDN serves static; the function only
// ever receives /api/* via rewrite), because client/dist isn't in the bundle.
const clientDist =
  process.env.CLIENT_DIST || fileURLToPath(new URL('../../client/dist', import.meta.url));
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API GET returns index.html so client routes work on refresh.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// Fallback error handler.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
