"""Rule-based coaching recommendations with optional Gemini integration.

This module loads a Gemini API key (from env or a local .venv file) and will
attempt to call the Gemini model to produce a short summary when available.
If the key or API call is unavailable, it falls back to the internal summary.
"""

from __future__ import annotations
import logging
import os
from pathlib import Path
from typing import Optional

try:
    from google import genai
except Exception:
    genai = None

logger = logging.getLogger(__name__)


def load_gemini_key() -> Optional[str]:
    # 1) prefer environment variable (safe for production/CI)
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()

    # 2) fallback to backend/.venv/GEMINI_API_KEY (for local dev)
    key_file = Path(__file__).resolve().parents[1] / ".venv" / "GEMINI_API_KEY"
    if key_file.exists():
        k = key_file.read_text(encoding="utf-8").strip()
        return k or None

    return None


def get_gemini_runtime_status() -> dict:
    """Return safe runtime indicators for logging and diagnostics."""
    key_present = bool(load_gemini_key())
    sdk_loaded = genai is not None
    return {"key_present": key_present, "sdk_loaded": sdk_loaded}


def _make_genai_client(api_key: str):
    if genai is None:
        raise RuntimeError("genai SDK not available")
    # try both common constructor forms
    try:
        return genai.Client(api_key=api_key)
    except TypeError:
        return genai.Client(api_key)


def _call_gemini(question: str, api_key: str) -> Optional[str]:
    if not api_key or genai is None:
        return None
    try:
        client = _make_genai_client(api_key)
        resp = client.models.generate_content(model="gemini-3-flash-preview", contents=question)

        # extract text in a few possible shapes
        if hasattr(resp, "text") and resp.text:
            return resp.text
        if hasattr(resp, "content") and resp.content:
            return resp.content
        # best-effort dict access
        try:
            d = getattr(resp, "__dict__", {})
            for key in ("text", "content", "output", "result"):
                if key in d and d[key]:
                    return str(d[key])
        except Exception:
            pass
        return str(resp)
    except Exception:
        return None


def build_coach_response(question: str, summary: dict, subscriptions: list[dict], gemini_api_key: Optional[str] = None) -> dict:
    """Return a small coaching response.

    If `gemini_api_key` is provided it will be used; otherwise the loader will try
    environment and local file locations.
    """
    question_lower = (question or "").lower()
    recommendations: list[dict] = []

    # Use provided key if present, else load
    gemini_key = gemini_api_key or load_gemini_key()
    gemini_text = _call_gemini(question, gemini_key) if gemini_key else None

    logger.info(
        "Coach Gemini status: key_present=%s sdk_loaded=%s using_fallback=%s",
        bool(gemini_key),
        genai is not None,
        gemini_text is None,
    )

    category_totals = summary.get("category_totals", [])
    top_categories = category_totals[:3]

    for item in top_categories[:2]:
        savings = round(item.get("amount", 0) * 0.15, 2)
        recommendations.append(
            {
                "title": f"Reduce {item.get('category', 'spending')} spending",
                "savings_impact": savings,
                "steps": [
                    f"Set a monthly cap for {item.get('category', 'this category')}.",
                    "Review purchases weekly and cut low-value items.",
                ],
            }
        )

    if subscriptions:
        highest_sub = subscriptions[0]
        recommendations.append(
            {
                "title": f"Review {highest_sub.get('merchant', 'subscription')} subscription",
                "savings_impact": highest_sub.get("monthly_cost", 0),
                "steps": [
                    "Check if you used this service in the last 30 days.",
                    "Flag it for cancellation if value is low.",
                ],
            }
        )

    if "cut" in question_lower or "save" in question_lower:
        recommendations = recommendations[:3]

    if not recommendations:
        recommendations.append(
            {
                "title": "Start with one spending category",
                "savings_impact": 25,
                "steps": [
                    "Pick your largest discretionary category.",
                    "Reduce that category by 10% this month.",
                ],
            }
        )

    summary_text = (
        f"You spent ${summary.get('total_spent_this_month', 0):,.2f} in your most recent month. "
        f"Your top category is {summary.get('biggest_category', {}).get('name', 'N/A')} and "
        f"estimated monthly subscription spend is ${summary.get('subscription_monthly_total', 0):,.2f}."
    )

    return {
        "summary_text": gemini_text or summary_text,
        "recommendations": recommendations,
    }

