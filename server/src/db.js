import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Two modes:
//  - Hosted (prod): TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) → remote libSQL/Turso.
//  - Local (dev):   a plain SQLite file under DATA_DIR (default server/data).
const remoteUrl = process.env.TURSO_DATABASE_URL;
let client;
if (remoteUrl) {
  client = createClient({ url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN });
} else {
  const dataDir = process.env.DATA_DIR || join(__dirname, '..', 'data');
  mkdirSync(dataDir, { recursive: true });
  const fileUrl = 'file:' + join(dataDir, 'fitness-freak.db').replace(/\\/g, '/');
  client = createClient({ url: fileUrl });
}

export const isRemote = Boolean(remoteUrl);

// libSQL args must be a positional array; map undefined → null (node:sqlite
// tolerated undefined, libSQL does not).
function norm(args) {
  return args.map((a) => (a === undefined ? null : a));
}

// Turn a libSQL result into plain, JSON-safe row objects keyed by column name.
function toObjects(rs) {
  return rs.rows.map((row) => {
    const o = {};
    for (const col of rs.columns) o[col] = row[col];
    return o;
  });
}

// A drop-in async shim for the subset of the node:sqlite API this app used:
//   db.prepare(sql).get(...params) / .all(...params) / .run(...params)
//   db.exec(sql)                    (DDL / multi-statement, no params)
// Every data method now returns a Promise, so call sites must `await`.
export const db = {
  prepare(sql) {
    return {
      async get(...params) {
        const rs = await client.execute({ sql, args: norm(params) });
        return toObjects(rs)[0];
      },
      async all(...params) {
        const rs = await client.execute({ sql, args: norm(params) });
        return toObjects(rs);
      },
      async run(...params) {
        const rs = await client.execute({ sql, args: norm(params) });
        return {
          changes: Number(rs.rowsAffected ?? 0),
          lastInsertRowid: rs.lastInsertRowid == null ? undefined : Number(rs.lastInsertRowid),
        };
      },
    };
  },
  async exec(sql) {
    await client.executeMultiple(sql);
  },
};

// --- Schema ------------------------------------------------------------------
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT NOT NULL,
    name       TEXT NOT NULL,
    notes      TEXT,
    exercises  TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);

  CREATE TABLE IF NOT EXISTS meals (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT NOT NULL,
    name       TEXT NOT NULL,
    meal_type  TEXT NOT NULL DEFAULT 'other',
    calories   REAL NOT NULL DEFAULT 0,
    protein    REAL NOT NULL DEFAULT 0,
    carbs      REAL NOT NULL DEFAULT 0,
    fat        REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

  CREATE TABLE IF NOT EXISTS activity (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date           TEXT NOT NULL,
    steps          INTEGER NOT NULL DEFAULT 0,
    distance_km    REAL NOT NULL DEFAULT 0,
    active_minutes INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    target     REAL NOT NULL,
    current    REAL NOT NULL DEFAULT 0,
    unit       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

  CREATE TABLE IF NOT EXISTS settings (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    calorie_target  REAL NOT NULL DEFAULT 2000,
    protein_target  REAL NOT NULL DEFAULT 150,
    carbs_target    REAL NOT NULL DEFAULT 200,
    fat_target      REAL NOT NULL DEFAULT 65,
    water_target_ml INTEGER NOT NULL DEFAULT 2500,
    step_target     INTEGER NOT NULL DEFAULT 10000,
    start_weight    REAL,
    goal_weight     REAL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weight_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT NOT NULL,
    weight     REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_logs(user_id, date);

  CREATE TABLE IF NOT EXISTS foods (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    calories   REAL NOT NULL DEFAULT 0,
    protein    REAL NOT NULL DEFAULT 0,
    carbs      REAL NOT NULL DEFAULT 0,
    fat        REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_foods_user ON foods(user_id);

  CREATE TABLE IF NOT EXISTS day_log (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date      TEXT NOT NULL,
    water_ml  INTEGER NOT NULL DEFAULT 0,
    habits    TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS integrations (
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      TEXT NOT NULL,
    access_token  TEXT,
    refresh_token TEXT,
    expires_at    INTEGER NOT NULL DEFAULT 0,
    scope         TEXT,
    last_synced   TEXT,
    connected_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, provider)
  );

  CREATE TABLE IF NOT EXISTS devices (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'other',
    battery     INTEGER NOT NULL DEFAULT 100,
    connected   INTEGER NOT NULL DEFAULT 1,
    last_synced TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

  CREATE TABLE IF NOT EXISTS sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         TEXT NOT NULL DEFAULT 'walk',
    title        TEXT,
    date         TEXT NOT NULL,
    duration_sec INTEGER NOT NULL DEFAULT 0,
    distance_km  REAL NOT NULL DEFAULT 0,
    notes        TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date);

  CREATE TABLE IF NOT EXISTS workout_templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    exercises  TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_wtemplates_user ON workout_templates(user_id);
`;

// Run once at startup, before the server accepts requests.
export async function initDb() {
  // Enforce foreign keys (for ON DELETE CASCADE). Harmless/ignored on remote.
  try {
    await client.execute('PRAGMA foreign_keys = ON');
  } catch {
    /* not supported on this backend */
  }
  await db.exec(SCHEMA);

  // Lightweight migrations: ADD COLUMN throws if it already exists — ignore.
  for (const sql of [
    'ALTER TABLE settings ADD COLUMN step_target INTEGER NOT NULL DEFAULT 10000',
    'ALTER TABLE settings ADD COLUMN onboarded INTEGER NOT NULL DEFAULT 0',
  ]) {
    try {
      await db.exec(sql);
    } catch {
      /* column already exists */
    }
  }
}
