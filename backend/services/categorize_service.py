"""Simple keyword-based categorization."""

from __future__ import annotations

import pandas as pd

CATEGORY_RULES = {
    "Food": ["restaurant", "cafe", "doordash", "uber eats"],
    "Groceries": ["whole foods", "trader joe", "walmart", "kroger"],
    "Rent": ["rent", "landlord"],
    "Utilities": ["electric", "water", "gas", "internet"],
    "Transport": ["uber", "lyft", "metro", "transit", "gas station"],
    "Entertainment": ["netflix", "spotify", "hulu", "disney"],
    "Shopping": ["amazon", "target"],
}


def categorize_transactions(df: pd.DataFrame) -> pd.DataFrame:
    categorized = df.copy()

    def categorize_row(row: pd.Series) -> str:
        existing_category = str(row.get("category", "")).strip()
        if existing_category and existing_category.lower() != "nan":
            return existing_category

        haystack = f"{row['merchant']} {row['description']}".lower()
        for category, keywords in CATEGORY_RULES.items():
            if any(keyword in haystack for keyword in keywords):
                return category
        return "Other"

    categorized["category"] = categorized.apply(categorize_row, axis=1)
    return categorized
