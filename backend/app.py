from __future__ import annotations

import os
import uuid

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

    categorized = categorize_transactions(normalized)
    subscriptions = detect_subscriptions(categorized)
    summary = build_summary(categorized, subscriptions)

    dataset_id = str(uuid.uuid4())
    save_dataset(
        dataset_id,
        {
            "transactions": categorized.to_dict(orient="records"),
            "subscriptions": subscriptions,
            "summary": summary,
        },
    )

    return jsonify({"dataset_id": dataset_id})


@app.route("/api/datasets/<dataset_id>/summary", methods=["GET"])
def get_summary(dataset_id: str):
    dataset = get_dataset(dataset_id)
    if dataset is None:
        return jsonify({"error": "Dataset not found."}), 404

    return jsonify({"dataset_id": dataset_id, **dataset["summary"]})


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
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
