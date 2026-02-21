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

## API Endpoints
- `POST /api/datasets/upload` (multipart form-data with `file`)
- `GET /api/datasets/<dataset_id>/summary`
- `GET /api/datasets/<dataset_id>/subscriptions`
- `POST /api/datasets/<dataset_id>/coach`

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
