# Deploying Fitness Freak (free)

The app ships as **one web service**: Express serves the API *and* the built
React app from a single URL. The database is a hosted **Turso** (libSQL)
database, so no paid persistent disk is needed and a free host works.

You'll do three things: **(1)** create the database, **(2)** push the code to
GitHub, **(3)** create the Render service. ~15 minutes.

---

## 1. Create the database (Turso — free)

Install the CLI (see https://docs.turso.tech/cli/installation), then:

```bash
turso auth signup
turso db create fitness-freak
turso db show fitness-freak --url        # -> copy this (TURSO_DATABASE_URL)
turso db tokens create fitness-freak     # -> copy this (TURSO_AUTH_TOKEN)
```

Keep those two values handy for step 3. (Prefer a UI? turso.tech has a web
dashboard that gives you the same URL + token.)

The schema is created automatically the first time the server starts — you
don't need to run any migrations.

---

## 2. Push the code to GitHub

The repo is already committed locally. Create an **empty** repo on GitHub
(no README/License), then from the project folder:

```bash
git remote add origin https://github.com/<your-username>/fitness-freak.git
git push -u origin main
```

---

## 3. Create the Render service (free)

1. Sign up at https://render.com and connect your GitHub.
2. **New +  →  Blueprint**, pick the `fitness-freak` repo. Render reads
   `render.yaml` and proposes one free web service.
3. When prompted, fill the secrets:
   - `TURSO_DATABASE_URL` — from step 1
   - `TURSO_AUTH_TOKEN` — from step 1
   - `FRONTEND_URL` — leave blank for now (set it after the first deploy)
   - `JWT_SECRET` — Render generates this automatically.
4. Click **Apply** / **Create**. First build takes a few minutes (it installs
   deps, builds the client, then starts the server).
5. When it's live you'll get a URL like `https://fitness-freak-xxxx.onrender.com`.
   Open it, create an account, and install it to your phone's home screen.
6. (Optional) Set `FRONTEND_URL` to that URL and redeploy — only needed for the
   Google Health OAuth redirect.

> **Free-tier note:** the service sleeps after ~15 min idle, so the first visit
> after a nap takes ~30–60s to wake. Fine for personal use. Your data lives in
> Turso, so it's safe across sleeps and redeploys.

---

## Installing on your phone

Once it's on the Render URL (HTTPS):

- **Android / Chrome:** open the URL → menu → **Add to Home screen** (or an
  install prompt appears).
- **iPhone / Safari:** open the URL → Share → **Add to Home Screen**.

It launches fullscreen like a native app, and "Share to Instagram Story" from
the Activity page uses the real native share sheet.

---

## Google Health / Fitbit Air (optional, later)

In Google Cloud Console, add your deployed callback to the OAuth client's
authorized redirect URIs:

```
https://<your-render-url>/api/integrations/google_health/callback
```

Then set on Render: `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`,
`GOOGLE_HEALTH_REDIRECT_URI` (the URL above), and `FRONTEND_URL`.

---

## Alternatives

A `Dockerfile` is included, so the same app deploys unchanged to any container
host (Fly.io, Railway, etc.) if you ever outgrow Render's free tier — just set
the same `TURSO_*` and `JWT_SECRET` env vars.
