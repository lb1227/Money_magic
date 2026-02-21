"""Persistent dataset store for MoneyMagic.

Uses a JSON file on disk so data survives Flask worker restarts.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from threading import Lock
from typing import Any

STORE_PATH = Path(os.getenv("DATASTORE_PATH", Path(__file__).with_name("data").joinpath("datasets.json")))
_LOCK = Lock()


def _load_all() -> dict[str, dict[str, Any]]:
    if not STORE_PATH.exists():
        return {}

    try:
        with STORE_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {}

    if not isinstance(data, dict):
        return {}

    return {str(key): value for key, value in data.items() if isinstance(value, dict)}


def _write_all(data: dict[str, dict[str, Any]]) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with STORE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(data, handle)


def save_dataset(dataset_id: str, payload: dict[str, Any]) -> None:
    with _LOCK:
        data = _load_all()
        data[dataset_id] = payload
        _write_all(data)


def get_dataset(dataset_id: str) -> dict[str, Any] | None:
    with _LOCK:
        return _load_all().get(dataset_id)
