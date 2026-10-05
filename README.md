# Fitness Freak

A full-stack health & fitness tracking web app. Log workouts, track nutrition and
daily activity, set goals, and watch your progress — all behind a real user account.

Built as a responsive web app, structured so a mobile (React Native/Expo) client can
reuse the same backend API later.

## Tech

- **Backend** — Node + Express, built-in `node:sqlite` database, `node:crypto` for
  scrypt password hashing and signed auth tokens. No native build step required
  (needs Node 22+; developed on Node 25).
- **Frontend** — React + Vite + TypeScript, React Router, Recharts.

## Features

- **Accounts** — register / log in, token-based auth.
- **Workouts** — log sessions with exercises, sets, reps, and weight.
- **Nutrition** — log meals with calories and macros (protein / carbs / fat) against a daily goal.
- **Activity** — record daily steps, distance, and active minutes.
- **Goals & progress** — set targets and visualize trends and streaks over time.
- **Dashboard** — today-at-a-glance summary pulling all of the above together.

## Getting started

Two dev servers run side by side. From the project root:

```bash
# 1. Backend  (http://localhost:4000)
cd server
npm install
npm run dev

# 2. Frontend (http://localhost:5173) — in a second terminal
cd client
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the backend, so open the frontend URL and go.

## Project layout

```
Fitness Freak/
├── server/   Express API + SQLite database
└── client/   React + Vite + TypeScript app
```
