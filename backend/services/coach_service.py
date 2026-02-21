"""Coaching recommendations with Gemini-first strategy and rule-based fallback."""

from __future__ import annotations

import json
import os


GEMINI_MODEL = "gemini-2.5-flash"


def _build_rule_based_response(question: str, summary: dict, subscriptions: list[dict]) -> dict:
    question_lower = (question or "").lower()
    recommendations: list[dict] = []

    category_totals = summary.get("category_totals", [])
    top_categories = category_totals[:3]

    for item in top_categories[:2]:
        savings = round(item["amount"] * 0.15, 2)
        recommendations.append(
            {
                "title": f"Reduce {item['category']} spending",
                "savings_impact": savings,
                "steps": [
                    f"Set a monthly cap for {item['category']}.",
                    "Review purchases weekly and cut low-value items.",
                ],
            }
        )

    if subscriptions:
        highest_sub = subscriptions[0]
        recommendations.append(
            {
                "title": f"Review {highest_sub['merchant']} subscription",
                "savings_impact": highest_sub["monthly_cost"],
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
        "summary_text": summary_text,
        "recommendations": recommendations,
    }


def _build_gemini_prompt(question: str, summary: dict, subscriptions: list[dict]) -> str:
    return (
        "You are BudgetBuddy Coach, a practical personal finance assistant. "
        "Given the user's question and account data, provide concise, actionable guidance.\n\n"
        "Return ONLY valid JSON, with this exact schema:\n"
        "{\n"
        '  "summary_text": "string",\n'
        '  "recommendations": [\n'
        "    {\n"
        '      "title": "string",\n'
        '      "savings_impact": number,\n'
        '      "steps": ["string", "string"]\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Constraints:\n"
        "- recommendations should have 1-3 items.\n"
        "- savings_impact should be a monthly dollar estimate.\n"
        "- Do not include markdown or explanatory text outside JSON.\n\n"
        f"User question:\n{question}\n\n"
        f"Summary JSON:\n{json.dumps(summary, ensure_ascii=False)}\n\n"
        f"Subscriptions JSON:\n{json.dumps(subscriptions, ensure_ascii=False)}\n"
    )


def _coerce_coach_shape(payload: dict) -> dict:
    summary_text = payload.get("summary_text")
    recommendations = payload.get("recommendations")

    if not isinstance(summary_text, str) or not summary_text.strip():
        raise ValueError("Gemini payload missing valid summary_text")
    if not isinstance(recommendations, list):
        raise ValueError("Gemini payload missing valid recommendations list")

    cleaned_recommendations: list[dict] = []
    for item in recommendations[:3]:
        if not isinstance(item, dict):
            continue

        title = item.get("title")
        steps = item.get("steps")
        if not isinstance(title, str) or not title.strip() or not isinstance(steps, list):
            continue

        cleaned_steps = [step for step in steps if isinstance(step, str) and step.strip()][:4]
        if not cleaned_steps:
            continue

        savings_impact = item.get("savings_impact", 0)
        try:
            savings_impact = float(savings_impact)
        except (TypeError, ValueError):
            savings_impact = 0.0

        cleaned_recommendations.append(
            {
                "title": title.strip(),
                "savings_impact": round(savings_impact, 2),
                "steps": cleaned_steps,
            }
        )

    if not cleaned_recommendations:
        raise ValueError("Gemini payload produced no valid recommendations")

    return {
        "summary_text": summary_text.strip(),
        "recommendations": cleaned_recommendations,
    }


def _build_gemini_response(question: str, summary: dict, subscriptions: list[dict]) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    from google import genai

    client = genai.Client(api_key=api_key)
    prompt = _build_gemini_prompt(question=question, summary=summary, subscriptions=subscriptions)
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)

    text = (response.text or "").strip()
    if not text:
        raise ValueError("Empty Gemini response")

    payload = json.loads(text)
    return _coerce_coach_shape(payload)


def build_coach_response(question: str, summary: dict, subscriptions: list[dict]) -> dict:
    try:
        return _build_gemini_response(question=question, summary=summary, subscriptions=subscriptions)
    except Exception:
        return _build_rule_based_response(question=question, summary=summary, subscriptions=subscriptions)
