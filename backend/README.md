# MoneyMagic Backend (Flask)

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


The API runs on `http://localhost:5001` by default. Set `PORT` to override.

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

## cURL Examples
```bash
curl -X POST http://localhost:5001/api/datasets/upload \
  -F "file=@sample.csv"
```

```bash
curl http://localhost:5001/api/datasets/<dataset_id>/summary
```

```bash
curl http://localhost:5001/api/datasets/<dataset_id>/subscriptions
```

```bash
curl -X POST http://localhost:5001/api/datasets/<dataset_id>/coach \
  -H "Content-Type: application/json" \
  -d '{"question":"How can I save money?"}'
```

## Deployment from GitHub Actions (optional)
The repo workflow can trigger backend deployments through a deploy hook URL.

1. Create a deploy hook on your backend host (Render, Railway, Fly, etc.).
2. Add it as a GitHub repository secret named `BACKEND_DEPLOY_HOOK_URL`.
3. Push changes to `backend/**` on `main` (or run the workflow manually).

The workflow sends a `POST` request to that URL to start deployment.

## Render deployment (recommended)
Use a Python Web Service with:
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app`

If you prefer not to use Gunicorn, set Start Command to `python app.py` instead.

