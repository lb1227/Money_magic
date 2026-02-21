"""Dataset summary computation."""

from __future__ import annotations

import pandas as pd


def build_summary(df: pd.DataFrame, subscriptions: list[dict]) -> dict:
    tx = df.copy()
    tx["parsed_date"] = pd.to_datetime(tx["date"])
    tx["month"] = tx["parsed_date"].dt.strftime("%Y-%m")

    spending = tx[tx["amount"] > 0]

    if spending.empty:
        biggest_category = {"name": "N/A", "amount": 0}
        category_totals = []
        monthly_totals = []
        total_spent_this_month = 0.0
    else:
        latest_month = spending["month"].max()
        month_spend = spending[spending["month"] == latest_month]["amount"].sum()
        total_spent_this_month = round(float(month_spend), 2)

        category_series = spending.groupby("category")["amount"].sum().sort_values(ascending=False)
        category_totals = [
            {"category": category, "amount": round(float(amount), 2)}
            for category, amount in category_series.items()
        ]

        if category_totals:
            biggest_category = {
                "name": category_totals[0]["category"],
                "amount": category_totals[0]["amount"],
            }
        else:
            biggest_category = {"name": "N/A", "amount": 0}

        monthly_series = spending.groupby("month")["amount"].sum().sort_index()
        monthly_totals = [
            {"month": month, "amount": round(float(amount), 2)}
            for month, amount in monthly_series.items()
        ]

    subscription_monthly_total = round(
        float(sum(item["monthly_cost"] for item in subscriptions)), 2
    )

    return {
        "total_spent_this_month": total_spent_this_month,
        "subscription_monthly_total": subscription_monthly_total,
        "biggest_category": biggest_category,
        "category_totals": category_totals,
        "monthly_totals": monthly_totals,
    }
