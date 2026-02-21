# BudgetBuddy Backend (Flask)

## Requirements
- Python 3.11+

## Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run
```bash
python app.py
```

The API runs on `http://localhost:5000` by default. Set `PORT` to override.

## Gemini Coach (optional, recommended)
Set `GEMINI_API_KEY` to make `/coach` use Gemini as the primary reasoning engine.

```bash
export GEMINI_API_KEY="your_api_key_here"
```

If `GEMINI_API_KEY` is missing or Gemini returns an error, the backend automatically falls back to the built-in rule-based coach.

## CORS
Set `CORS_ORIGINS` as a comma-separated list of allowed origins.

Examples:
- Local dev: `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`
- Allow all (only when needed): `CORS_ORIGINS=*`

## API Endpoints
- `POST /api/datasets/upload` (multipart form-data with `file`)
- `GET /api/datasets/<dataset_id>/summary`
- `GET /api/datasets/<dataset_id>/subscriptions`
- `POST /api/datasets/<dataset_id>/coach`
- `POST /api/coach` (coach without dataset; optional `context`)

## cURL Examples
```bash
curl -X POST http://localhost:5000/api/datasets/upload \
  -F "file=@sample.csv"
```

```bash
curl http://localhost:5000/api/datasets/<dataset_id>/summary
```

```bash
curl http://localhost:5000/api/datasets/<dataset_id>/subscriptions
```

```bash
curl -X POST http://localhost:5000/api/datasets/<dataset_id>/coach \
  -H "Content-Type: application/json" \
  -d '{"question":"How can I save money?"}'
```


```bash
curl -X POST http://localhost:5000/api/coach \
  -H "Content-Type: application/json" \
  -d '{"question":"How should I start budgeting?","context":{"income":4500,"goals":["build emergency fund"]}}'
```
