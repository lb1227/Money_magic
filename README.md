# MoneyMagic

Monorepo containing a Flask backend and React + Vite frontend for MoneyMagic.

## Project structure
- `backend/` Flask API (CSV upload, summaries, subscriptions, coach)
- `client/` React UI with TailwindCSS, React Router, Recharts

## Backend quick start
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Client quick start
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The frontend reads `VITE_API_BASE_URL` from `.env` and defaults to `/api`.
In local development, Vite proxies `/api` requests to `http://localhost:5001`.


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
- Set `VITE_API_BASE_URL` to your deployed backend URL (for example `https://your-backend.example.com/api`) when building for Pages.
- The workflow also supports backend deploys by calling a provider deploy hook URL stored in the `BACKEND_DEPLOY_HOOK_URL` repository secret.
- Typical backend providers for this pattern: Render/Railway/Fly deploy hook endpoints.

## Frontend routes
- `/dashboard` unified dashboard for manual entry (primary), optional CSV import, and charts/graphs
- `/subscriptions` detected subscriptions table with UI-only cancel flags
- `/coach` rule-based coaching chat UI
