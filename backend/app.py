from __future__ import annotations

import os
import uuid
from datetime import date, datetime, timedelta
from urllib.parse import quote_plus

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

allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,https://lb1227.github.io",
)
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
        return pd.DataFrame(
            columns=[
                "tx_id",
                "date",
                "description",
                "merchant",
                "amount",
                "category",
                "source",
                "interval_days",
                "next_charge_date",
            ]
        )

    required = [
        "tx_id",
        "date",
        "description",
        "merchant",
        "amount",
        "category",
        "source",
        "interval_days",
        "next_charge_date",
    ]
    for col in required:
        if col not in tx.columns:
            if col == "amount":
                tx[col] = 0.0
            elif col == "interval_days":
                tx[col] = 0
            else:
                tx[col] = ""

    tx["amount"] = pd.to_numeric(tx["amount"], errors="coerce").fillna(0.0)
    tx["tx_id"] = tx["tx_id"].astype(str)
    tx.loc[tx["tx_id"].str.strip() == "", "tx_id"] = [str(uuid.uuid4()) for _ in range((tx["tx_id"].str.strip() == "").sum())]
    tx["date"] = tx["date"].astype(str)
    tx["description"] = tx["description"].astype(str)
    tx["merchant"] = tx["merchant"].astype(str)
    tx["category"] = tx["category"].astype(str)
    tx["source"] = tx["source"].astype(str)
    tx["interval_days"] = pd.to_numeric(tx["interval_days"], errors="coerce").fillna(0).astype(int)
    tx["next_charge_date"] = tx["next_charge_date"].astype(str)
    return tx[required]


def _rebuild_dataset(transactions: list[dict], goals: dict | None = None, explicit_subscriptions: list[dict] | None = None) -> dict:
    tx = _coerce_transactions(transactions)
    categorized = categorize_transactions(tx)

    manual_subscriptions = []
    for transaction in categorized.to_dict(orient="records"):
        is_manual_subscription = (
            transaction.get("source") == "manual_subscription"
            or str(transaction.get("category", "")).lower() == "subscription"
        )
        amount = float(transaction.get("amount", 0) or 0)
        merchant = str(transaction.get("merchant", "") or "").strip()
        if not is_manual_subscription or amount <= 0 or not merchant:
            continue

        interval_days = max(1, int(float(transaction.get("interval_days", 30) or 30)))
        monthly_cost = round(amount * (30 / interval_days), 2)
        manual_subscriptions.append(
            {
                "merchant": merchant,
                "interval_days": interval_days,
                "monthly_cost": monthly_cost,
                "next_charge_date": transaction.get("next_charge_date") or transaction.get("date", ""),
                "confidence": None,
            }
        )

    # If the client provided explicit subscriptions (from manual entry), trust and use them.
    if isinstance(explicit_subscriptions, list) and explicit_subscriptions:
        subscriptions = [*explicit_subscriptions, *manual_subscriptions]
    else:
        subscriptions = [*detect_subscriptions(categorized), *manual_subscriptions]

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
    payload = _rebuild_dataset(normalized.assign(source="csv").to_dict(orient="records"))
    save_dataset(dataset_id, payload)

    return jsonify({"dataset_id": dataset_id})


@app.route("/api/datasets/manual", methods=["POST"])
def create_manual_dataset():
    payload = request.get_json(silent=True) or {}
    transactions = payload.get("transactions", [])
    if not isinstance(transactions, list):
        return jsonify({"error": "Body must include a transactions array."}), 400

    dataset_id = str(uuid.uuid4())
    save_dataset(dataset_id, _rebuild_dataset(transactions, payload.get("goals"), payload.get("subscriptions")))
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

    payload["tx_id"] = payload.get("tx_id") or str(uuid.uuid4())
    payload["source"] = payload.get("source") or "manual"
    transactions = [*dataset.get("transactions", []), payload]
    save_dataset(dataset_id, _rebuild_dataset(transactions, dataset.get("goals", {})))
    return jsonify({"dataset_id": dataset_id, "transaction_count": len(transactions)})


@app.route("/api/datasets/<dataset_id>/transactions", methods=["GET"])
def list_transactions(dataset_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    return jsonify({"dataset_id": dataset_id, "transactions": dataset.get("transactions", [])})


@app.route("/api/datasets/<dataset_id>/transactions/<tx_id>", methods=["PUT"])
def update_transaction(dataset_id: str, tx_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    payload = request.get_json(silent=True) or {}
    required = ["date", "description", "merchant", "amount"]
    if any(field not in payload for field in required):
        return jsonify({"error": "Body must include date, description, merchant, and amount."}), 400

    updated = False
    transactions = []
    for transaction in dataset.get("transactions", []):
        if transaction.get("tx_id") == tx_id:
            updated = True
            transactions.append(
                {
                    **transaction,
                    **payload,
                    "tx_id": tx_id,
                }
            )
        else:
            transactions.append(transaction)

    if not updated:
        return jsonify({"error": "Transaction not found."}), 404

    save_dataset(dataset_id, _rebuild_dataset(transactions, dataset.get("goals", {})))
    return jsonify({"dataset_id": dataset_id, "tx_id": tx_id})


@app.route("/api/datasets/<dataset_id>/transactions/<tx_id>", methods=["DELETE"])
def delete_transaction(dataset_id: str, tx_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    previous = dataset.get("transactions", [])
    transactions = [transaction for transaction in previous if transaction.get("tx_id") != tx_id]
    if len(transactions) == len(previous):
        return jsonify({"error": "Transaction not found."}), 404

    save_dataset(dataset_id, _rebuild_dataset(transactions, dataset.get("goals", {})))
    return jsonify({"dataset_id": dataset_id, "tx_id": tx_id})


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

    def _next_due(last_charge: date, interval_days: int) -> date:
        today = date.today()
        safe_interval = max(1, interval_days)
        due = last_charge
        while due < today:
            due = due + timedelta(days=safe_interval)
        return due

    events_map: dict[tuple[str, str], dict] = {}

    # 1) Use detected subscriptions.
    for subscription in dataset.get("subscriptions", []):
        merchant = subscription.get("merchant", "Subscription")
        due_iso = str(subscription.get("next_charge_date", ""))
        if not due_iso:
            continue
        text = f"Pay {merchant} subscription"
        details = f"Estimated monthly cost ${subscription.get('monthly_cost', 0)}"
        dates = due_iso.replace("-", "")
        url = (
            "https://calendar.google.com/calendar/render?action=TEMPLATE"
            f"&text={quote_plus(text)}"
            f"&dates={dates}/{dates}"
            f"&details={quote_plus(details)}"
        )
        key = (merchant, due_iso)
        events_map[key] = {
            "title": text,
            "date": due_iso,
            "google_calendar_url": url,
        }

    # 2) Include manual subscription entries as recurring due dates.
    manual_transactions = [
        tx
        for tx in dataset.get("transactions", [])
        if (
            tx.get("source") == "manual_subscription"
            or str(tx.get("category", "")).lower() == "subscription"
        )
        and float(tx.get("amount", 0) or 0) > 0
        and tx.get("merchant")
        and tx.get("date")
    ]

    latest_by_merchant: dict[str, dict] = {}
    for tx in manual_transactions:
        merchant = str(tx.get("merchant"))
        current = latest_by_merchant.get(merchant)
        if current is None or str(tx.get("date", "")) > str(current.get("date", "")):
            latest_by_merchant[merchant] = tx

    for merchant, tx in latest_by_merchant.items():
        try:
            last_charge = datetime.strptime(str(tx["date"]), "%Y-%m-%d").date()
        except ValueError:
            continue
        interval_days = int(float(tx.get("interval_days", 30) or 30))
        raw_next_charge = str(tx.get("next_charge_date", "") or "").strip()
        if raw_next_charge:
            try:
                base_due = datetime.strptime(raw_next_charge, "%Y-%m-%d").date()
            except ValueError:
                base_due = last_charge
        else:
            base_due = last_charge

        due_date = _next_due(base_due, interval_days)
        due_iso = due_date.isoformat()
        text = f"Pay {merchant} subscription"
        details = f"Estimated monthly cost ${round(float(tx.get('amount', 0) or 0), 2)}"
        dates = due_iso.replace("-", "")
        url = (
            "https://calendar.google.com/calendar/render?action=TEMPLATE"
            f"&text={quote_plus(text)}"
            f"&dates={dates}/{dates}"
            f"&details={quote_plus(details)}"
        )
        key = (merchant, due_iso)
        if key not in events_map:
            events_map[key] = {
                "title": text,
                "date": due_iso,
                "google_calendar_url": url,
            }

    # 3) Include one-time future payments created from the calendar UI.
    for tx in dataset.get("transactions", []):
        if tx.get("source") != "one_time_future_payment":
            continue
        tx_date = str(tx.get("date", "")).strip()
        merchant = str(tx.get("merchant", "Planned payment")).strip() or "Planned payment"
        description = str(tx.get("description", "")).strip()
        if not tx_date:
            continue
        try:
            parsed = datetime.strptime(tx_date, "%Y-%m-%d").date()
        except ValueError:
            continue
        if parsed < date.today():
            continue

        title = description or f"One-time payment: {merchant}"
        details = f"Planned amount ${round(float(tx.get('amount', 0) or 0), 2)}"
        dates = tx_date.replace("-", "")
        url = (
            "https://calendar.google.com/calendar/render?action=TEMPLATE"
            f"&text={quote_plus(title)}"
            f"&dates={dates}/{dates}"
            f"&details={quote_plus(details)}"
        )
        key = (title, tx_date)
        events_map[key] = {
            "title": title,
            "date": tx_date,
            "google_calendar_url": url,
        }

    events = sorted(events_map.values(), key=lambda item: item["date"])

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
        return jsonify({
            "error": "Dataset not found.",
            "hint": "Create a manual dataset first via POST /api/datasets/manual, or use POST /api/datasets/manual-subscriptions to create one with subscriptions."
        }), 404

    return jsonify({
        "dataset_id": dataset_id,
        "subscriptions": dataset.get("subscriptions", []),
    })


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
