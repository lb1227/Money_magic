from __future__ import annotations

import os
import uuid

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from services.categorize_service import categorize_transactions
from services.coach_service import build_coach_response
from services.csv_service import CSVParseError, parse_and_normalize_csv
from services.recurring_service import detect_subscriptions
from services.summary_service import build_summary
from store import get_dataset, save_dataset

app = Flask(__name__)

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
if "*" in origins:
    origins = "*"

CORS(app, resources={r"/api/*": {"origins": origins}})


@app.errorhandler(404)
def not_found(_: Exception):
    return jsonify({"error": "Not found"}), 404


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


def _coerce_transactions(rows: list[dict]) -> pd.DataFrame:
    tx = pd.DataFrame(rows or [])
    if tx.empty:
        return pd.DataFrame(columns=["date", "description", "merchant", "amount"])

    required = ["date", "description", "merchant", "amount"]
    for col in required:
        if col not in tx.columns:
            tx[col] = "" if col != "amount" else 0.0

    tx["amount"] = pd.to_numeric(tx["amount"], errors="coerce").fillna(0.0)
    tx["date"] = tx["date"].astype(str)
    tx["description"] = tx["description"].astype(str)
    tx["merchant"] = tx["merchant"].astype(str)
    return tx[required]


def _rebuild_dataset(transactions: list[dict], goals: dict | None = None) -> dict:
    tx = _coerce_transactions(transactions)
    categorized = categorize_transactions(tx)
    subscriptions = detect_subscriptions(categorized)
    summary = build_summary(categorized, subscriptions)
    return {
        "transactions": categorized.to_dict(orient="records"),
        "subscriptions": subscriptions,
        "summary": summary,
        "goals": goals or {},
    }


@app.route("/api/datasets/upload", methods=["POST"])
def upload_dataset():
    if "file" not in request.files:
        return jsonify({"error": "Missing file field named 'file'."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected."}), 400

    try:
        normalized = parse_and_normalize_csv(file.read())
    except CSVParseError as exc:
        return jsonify({"error": str(exc)}), 400

    dataset_id = str(uuid.uuid4())
    payload = _rebuild_dataset(normalized.to_dict(orient="records"))
    save_dataset(dataset_id, payload)

    return jsonify({"dataset_id": dataset_id})


@app.route("/api/datasets/manual", methods=["POST"])
def create_manual_dataset():
    payload = request.get_json(silent=True) or {}
    transactions = payload.get("transactions", [])
    if not isinstance(transactions, list):
        return jsonify({"error": "Body must include a transactions array."}), 400

    dataset_id = str(uuid.uuid4())
    save_dataset(dataset_id, _rebuild_dataset(transactions, payload.get("goals")))
    return jsonify({"dataset_id": dataset_id})


@app.route("/api/datasets/<dataset_id>/transactions", methods=["POST"])
def add_transaction(dataset_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    payload = request.get_json(silent=True) or {}
    required = ["date", "description", "merchant", "amount"]
    if any(field not in payload for field in required):
        return jsonify({"error": "Body must include date, description, merchant, and amount."}), 400

    transactions = [*dataset.get("transactions", []), payload]
    save_dataset(dataset_id, _rebuild_dataset(transactions, dataset.get("goals", {})))
    return jsonify({"dataset_id": dataset_id, "transaction_count": len(transactions)})


@app.route("/api/datasets/<dataset_id>/goals", methods=["PUT"])
def upsert_goals(dataset_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    payload = request.get_json(silent=True) or {}
    monthly_budget = payload.get("monthly_budget")
    savings_goal = payload.get("savings_goal")

    goals = dataset.get("goals", {}).copy()
    if monthly_budget is not None:
        goals["monthly_budget"] = float(monthly_budget)
    if savings_goal is not None:
        goals["savings_goal"] = float(savings_goal)

    dataset["goals"] = goals
    save_dataset(dataset_id, dataset)
    return jsonify({"dataset_id": dataset_id, "goals": goals})


@app.route("/api/datasets/<dataset_id>/calendar-events", methods=["GET"])
def get_calendar_events(dataset_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    events = []
    for subscription in dataset.get("subscriptions", []):
        text = f"Pay {subscription['merchant']} subscription"
        details = f"Estimated monthly cost ${subscription['monthly_cost']}"
        date = subscription["next_charge_date"].replace("-", "")
        url = (
            "https://calendar.google.com/calendar/render?action=TEMPLATE"
            f"&text={text.replace(' ', '+')}"
            f"&dates={date}/{date}"
            f"&details={details.replace(' ', '+')}"
        )
        events.append(
            {
                "title": text,
                "date": subscription["next_charge_date"],
                "google_calendar_url": url,
            }
        )

    return jsonify({"dataset_id": dataset_id, "events": events})


@app.route("/api/datasets/<dataset_id>/summary", methods=["GET"])
def get_summary(dataset_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    return jsonify({"dataset_id": dataset_id, "goals": dataset.get("goals", {}), **dataset["summary"]})


@app.route("/api/datasets/<dataset_id>/subscriptions", methods=["GET"])
def get_subscriptions(dataset_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    return jsonify({"dataset_id": dataset_id, "subscriptions": dataset["subscriptions"]})


@app.route("/api/datasets/<dataset_id>/coach", methods=["POST"])
def coach(dataset_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    payload = request.get_json(silent=True) or {}
    question = payload.get("question")
    if not isinstance(question, str) or not question.strip():
        return jsonify({"error": "Body must include non-empty 'question'."}), 400

    response = build_coach_response(
        question=question,
        summary=dataset["summary"],
        subscriptions=dataset["subscriptions"],
    )

    return jsonify({"dataset_id": dataset_id, **response})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
