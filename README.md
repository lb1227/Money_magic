# MoneyMagic

Monorepo containing a Flask backend and React + Vite frontend for MoneyMagic.

## Project structure
- `backend/` Flask API (CSV upload, summaries, subscriptions, coach)
- `client/` React UI with TailwindCSS, React Router, Recharts


## Refresh dependencies from `main`
```bash
git checkout main
git pull
cd client
npm install
```

## GitHub Pages deployment notes
- The frontend uses hash-based routing so deep links work on GitHub Pages.
- Build output uses relative asset paths (`base: './'`) for project pages.
- This repo is configured to use `https://money-magic.onrender.com/api` for Pages builds by default.
- You can override it with the GitHub Actions repository variable `VITE_API_BASE_URL`.
- The workflow also supports backend deploys by calling a provider deploy hook URL stored in the `BACKEND_DEPLOY_HOOK_URL` repository secret.
- Typical backend providers for this pattern: Render/Railway/Fly deploy hook endpoints.
- Backend CORS must allow your frontend origin. Set `CORS_ORIGINS` (comma-separated) on Render if needed.
- Backend dataset persistence uses `DATASTORE_PATH` (defaults to `backend/data/datasets.json`).
  On Render, use a persistent disk + set `DATASTORE_PATH` to keep data across deploys/restarts.

## Frontend routes
- `/dashboard` unified dashboard for manual entry (primary), optional CSV import, and charts/graphs
- `/subscriptions` detected subscriptions table with UI-only cancel flags
- `/coach` rule-based coaching chat UI


## Supabase per-account persistence
To persist each account's active dataset, run `client/supabase-schema.sql` in your Supabase SQL editor.

It creates:
- `public.user_datasets` (`user_id` -> `dataset_id` mapping)
- RLS policies so each user can only read/write their own row

The frontend now reads/writes this mapping on login, so each account gets its own persistent MoneyMagic dataset.
