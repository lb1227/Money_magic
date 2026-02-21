"""CSV parsing and normalization helpers."""

from __future__ import annotations

from io import BytesIO

import pandas as pd


DATE_COLUMNS = ["date", "transaction date", "posted date"]
MERCHANT_COLUMNS = ["merchant", "description", "payee", "name"]
DESCRIPTION_COLUMNS = ["description", "memo", "details", "notes"]
AMOUNT_COLUMNS = ["amount", "debit", "transaction amount"]
CREDIT_COLUMNS = ["credit", "deposit"]


class CSVParseError(ValueError):
    """Raised when CSV cannot be normalized."""


def _find_column(columns: list[str], candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate in columns:
            return candidate
    return None


def parse_and_normalize_csv(file_bytes: bytes) -> pd.DataFrame:
    if not file_bytes:
        raise CSVParseError("Uploaded file is empty.")

    try:
        df = pd.read_csv(BytesIO(file_bytes))
    except Exception as exc:  # pandas parsing errors vary
        raise CSVParseError(f"Unable to parse CSV: {exc}") from exc

    if df.empty:
        raise CSVParseError("CSV file has no rows.")

    original_columns = df.columns.tolist()
    normalized_columns = [str(col).strip().lower() for col in original_columns]
    df.columns = normalized_columns

    date_col = _find_column(normalized_columns, DATE_COLUMNS)
    merchant_col = _find_column(normalized_columns, MERCHANT_COLUMNS)
    description_col = _find_column(normalized_columns, DESCRIPTION_COLUMNS)
    amount_col = _find_column(normalized_columns, AMOUNT_COLUMNS)
    credit_col = _find_column(normalized_columns, CREDIT_COLUMNS)

    if not date_col:
        raise CSVParseError("Could not find a date column.")
    if not merchant_col:
        raise CSVParseError("Could not find a merchant/description column.")

    working = pd.DataFrame()
    working["date"] = pd.to_datetime(df[date_col], errors="coerce")

    if amount_col:
        working["amount"] = pd.to_numeric(df[amount_col], errors="coerce")
    elif credit_col:
        working["amount"] = -pd.to_numeric(df[credit_col], errors="coerce")
    else:
        raise CSVParseError("Could not find amount/debit/credit column.")

    if credit_col and amount_col and credit_col in df.columns:
        credits = pd.to_numeric(df[credit_col], errors="coerce").fillna(0)
        working["amount"] = pd.to_numeric(df[amount_col], errors="coerce").fillna(0) - credits

    working["merchant"] = df[merchant_col].astype(str).str.strip()
    desc_series = df[description_col] if description_col else df[merchant_col]
    working["description"] = desc_series.astype(str).str.strip()

    working = working.dropna(subset=["date", "amount"])
    working = working[working["merchant"] != ""]

    if working.empty:
        raise CSVParseError("No valid transaction rows found after normalization.")

    working["date"] = working["date"].dt.strftime("%Y-%m-%d")
    working["amount"] = working["amount"].astype(float).round(2)

    return working[["date", "merchant", "amount", "description"]]
