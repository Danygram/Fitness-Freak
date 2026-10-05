import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, createToken, verifyToken } from '../auth.js';

const router = Router();

const PROVIDER = 'google_health';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const HEALTH_BASE = 'https://health.googleapis.com';

// Read-only scopes for steps/workouts, heart rate, and sleep.
const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'openid',
  'email',
];

function cfg() {
  return {
    clientId: process.env.GOOGLE_HEALTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_HEALTH_CLIENT_SECRET,
    redirectUri:
      process.env.GOOGLE_HEALTH_REDIRECT_URI ||
      'http://localhost:4000/api/integrations/google_health/callback',
    frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
  };
}
const configured = () => {
  const c = cfg();
  return !!(c.clientId && c.clientSecret);
};

// --- DB ---------------------------------------------------------------------
const getIntg = db.prepare('SELECT * FROM integrations WHERE user_id = ? AND provider = ?');
const upsertIntg = db.prepare(`
  INSERT INTO integrations (user_id, provider, access_token, refresh_token, expires_at, scope, connected_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, provider) DO UPDATE SET
    access_token = excluded.access_token,
    refresh_token = COALESCE(excluded.refresh_token, integrations.refresh_token),
    expires_at = excluded.expires_at,
    scope = excluded.scope
`);
const updateAccess = db.prepare(
  'UPDATE integrations SET access_token = ?, expires_at = ? WHERE user_id = ? AND provider = ?'
);
const setSynced = db.prepare(
  "UPDATE integrations SET last_synced = datetime('now') WHERE user_id = ? AND provider = ?"
);
const deleteIntg = db.prepare('DELETE FROM integrations WHERE user_id = ? AND provider = ?');

const activityUpsert = db.prepare(`
  INSERT INTO activity (user_id, date, steps, distance_km, active_minutes)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id, date) DO UPDATE SET
    steps = excluded.steps,
    active_minutes = MAX(activity.active_minutes, excluded.active_minutes)
`);

// --- OAuth helpers ----------------------------------------------------------
async function storeTokens(userId, t) {
  const expiresAt = Math.floor(Date.now() / 1000) + (Number(t.expires_in) || 3600);
  await upsertIntg.run(userId, PROVIDER, t.access_token, t.refresh_token || null, expiresAt, t.scope || SCOPES.join(' '));
}

async function exchangeCode(code) {
  const c = cfg();
  const body = new URLSearchParams({
    code,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: c.redirectUri,
    grant_type: 'authorization_code',
  });
  const r = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`token exchange failed (${r.status}): ${await r.text()}`);
  return r.json();
}

async function refresh(userId, refreshToken) {
  const c = cfg();
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const r = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`token refresh failed (${r.status})`);
  const t = await r.json();
  const expiresAt = Math.floor(Date.now() / 1000) + (Number(t.expires_in) || 3600);
  await updateAccess.run(t.access_token, expiresAt, userId, PROVIDER);
  return t.access_token;
}

async function getValidToken(userId) {
  const row = await getIntg.get(userId, PROVIDER);
  if (!row) throw new Error('not connected');
  if (row.expires_at > Math.floor(Date.now() / 1000) + 60) return row.access_token;
  if (!row.refresh_token) throw new Error('no refresh token — please reconnect');
  return refresh(userId, row.refresh_token);
}

// --- Google Health data fetch (v1 — field mapping verified on first real sync) ---
async function healthGet(path, token, params = {}) {
  const url = `${HEALTH_BASE}${path}?${new URLSearchParams(params).toString()}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!r.ok) {
    const err = new Error(`Google Health ${path} responded ${r.status}`);
    err.status = r.status;
    err.detail = json;
    throw err;
  }
  return json;
}

// Pull any numeric magnitudes out of a dataPoint, whatever the exact shape.
function numbersIn(obj, acc = []) {
  if (obj == null) return acc;
  if (typeof obj === 'number') acc.push(obj);
  else if (Array.isArray(obj)) obj.forEach((v) => numbersIn(v, acc));
  else if (typeof obj === 'object') Object.values(obj).forEach((v) => numbersIn(v, acc));
  return acc;
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// --- Routes -----------------------------------------------------------------
router.get('/status', requireAuth, async (req, res, next) => {
  try {
  const row = await getIntg.get(req.user.id, PROVIDER);
  res.json({
    provider: PROVIDER,
    configured: configured(),
    connected: !!(row && row.refresh_token),
    scope: row?.scope || null,
    last_synced: row?.last_synced || null,
  });
  } catch (e) { next(e); }
});

router.get('/google_health/connect', requireAuth, (req, res) => {
  if (!configured()) {
    return res.status(503).json({
      error:
        'Google Health isn’t configured yet. Add GOOGLE_HEALTH_CLIENT_ID and GOOGLE_HEALTH_CLIENT_SECRET to server/.env.',
    });
  }
  const c = cfg();
  const state = createToken(req.user.id); // signed; carries the user id through the redirect
  const url =
    `${GOOGLE_AUTH_URL}?` +
    new URLSearchParams({
      client_id: c.clientId,
      redirect_uri: c.redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    }).toString();
  res.json({ url });
});

// OAuth redirect target — no auth header here; the user id rides in `state`.
router.get('/google_health/callback', async (req, res) => {
  const c = cfg();
  const back = (status) => res.redirect(`${c.frontend}/devices?connected=${status}`);
  try {
    const { code, state, error } = req.query;
    if (error || !code) return back('error');
    const payload = verifyToken(String(state));
    if (!payload) return back('error');
    const tokens = await exchangeCode(String(code));
    await storeTokens(payload.sub, tokens);
    back('google_health');
  } catch (e) {
    console.error('google_health callback error:', e.message);
    back('error');
  }
});

router.post('/google_health/sync', requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.user.id);
    const date = todayISO();
    const start = `${date}T00:00:00Z`;
    const end = new Date().toISOString();

    let steps = 0;
    let workouts = 0;
    let activeMinutes = 0;
    const warnings = [];

    // Steps today
    try {
      const data = await healthGet(`/v4/users/me/dataTypes/steps/dataPoints`, token, {
        startTime: start,
        endTime: end,
        pageSize: '500',
      });
      const points = data.dataPoints || data.points || [];
      steps = Math.round(points.reduce((a, p) => a + Math.max(...numbersIn(p.value ?? p), 0), 0));
    } catch (e) {
      warnings.push(`steps: ${e.message}`);
    }

    // Workouts / exercise today
    try {
      const data = await healthGet(`/v4/users/me/dataTypes/exercise/dataPoints`, token, {
        startTime: start,
        endTime: end,
        pageSize: '200',
      });
      const points = data.dataPoints || data.points || [];
      workouts = points.length;
      for (const p of points) {
        const s = p.startTime ? Date.parse(p.startTime) : null;
        const e = p.endTime ? Date.parse(p.endTime) : null;
        if (s && e && e > s) activeMinutes += Math.round((e - s) / 60000);
      }
    } catch (e) {
      warnings.push(`exercise: ${e.message}`);
    }

    if (steps > 0 || activeMinutes > 0) {
      await activityUpsert.run(req.user.id, date, steps, 0, activeMinutes);
    }
    await setSynced.run(req.user.id, PROVIDER);

    res.json({ date, steps, workouts, activeMinutes, warnings });
  } catch (e) {
    res.status(e.message === 'not connected' ? 400 : 502).json({ error: e.message, detail: e.detail });
  }
});

router.delete('/google_health', requireAuth, async (req, res, next) => {
  try {
    const row = await getIntg.get(req.user.id, PROVIDER);
    if (row?.refresh_token) {
      try {
        await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(row.refresh_token)}`, {
          method: 'POST',
        });
      } catch {
        /* best-effort revoke */
      }
    }
    await deleteIntg.run(req.user.id, PROVIDER);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
