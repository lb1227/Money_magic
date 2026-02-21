"""Rule-based coaching recommendations."""

from __future__ import annotations


def build_coach_response(question: str, summary: dict, subscriptions: list[dict]) -> dict:
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
