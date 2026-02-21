# BudgetBuddy

Monorepo containing a Flask backend and React + Vite frontend for BudgetBuddy.

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

The frontend reads `VITE_API_BASE_URL` from `.env` and defaults to `http://localhost:5000`.

## Frontend routes
- `/upload` CSV upload flow
- `/dashboard` summary cards + category chart
- `/subscriptions` detected subscriptions table with UI-only cancel flags
- `/coach` rule-based coaching chat UI
