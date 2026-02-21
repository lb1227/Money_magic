"""Recurring subscription detection logic."""

from __future__ import annotations

from datetime import timedelta

import numpy as np
import pandas as pd

TARGET_INTERVALS = [7, 14, 30]
TOLERANCE_DAYS = 3


def _closest_interval(interval: float) -> int:
    return min(TARGET_INTERVALS, key=lambda target: abs(target - interval))


def _confidence_from_std(stddev: float) -> float:
    score = max(0.0, 1.0 - (stddev / 10.0))
    return round(float(score), 2)


def detect_subscriptions(df: pd.DataFrame) -> list[dict]:
    if df.empty:
        return []

    tx = df.copy()
    tx["parsed_date"] = pd.to_datetime(tx["date"])
    tx = tx[tx["amount"] > 0]

    subscriptions: list[dict] = []

    for merchant, group in tx.groupby("merchant"):
        if len(group) < 3:
            continue

        group_sorted = group.sort_values("parsed_date")
        gaps = group_sorted["parsed_date"].diff().dropna().dt.days
        if len(gaps) < 2:
            continue

        median_gap = float(np.median(gaps))
        closest = _closest_interval(median_gap)
        if abs(median_gap - closest) > TOLERANCE_DAYS:
            continue

        stddev = float(np.std(gaps))
        confidence = _confidence_from_std(stddev)

        interval_days = int(round(median_gap))
        avg_amount = float(group_sorted["amount"].mean())
        monthly_cost = avg_amount * (30 / interval_days) if interval_days > 0 else avg_amount

        last_date = group_sorted["parsed_date"].max().to_pydatetime()
        next_charge_date = (last_date + timedelta(days=interval_days)).strftime("%Y-%m-%d")

        subscriptions.append(
            {
                "merchant": merchant,
                "interval_days": interval_days,
                "monthly_cost": round(monthly_cost, 2),
                "next_charge_date": next_charge_date,
                "confidence": confidence,
            }
        )

    subscriptions.sort(key=lambda item: item["monthly_cost"], reverse=True)
    return subscriptions
