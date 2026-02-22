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

## Supabase auth + per-user dataset persistence
The frontend now supports Supabase email/password auth and stores the signed-in user's active dataset id in Supabase.

### Required frontend env vars
Set these in your deployment secrets/variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Required Supabase table
Create this table in Supabase SQL editor:

```sql
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_dataset_id text,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "user_profiles_select_own"
on public.user_profiles
for select
using (auth.uid() = user_id);

create policy "user_profiles_insert_own"
on public.user_profiles
for insert
with check (auth.uid() = user_id);

create policy "user_profiles_update_own"
on public.user_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### Supabase Auth settings
- Enable Email provider (Auth > Providers).
- Decide whether email confirmation is required.
  - If required, users will see a message to confirm email after sign-up.
