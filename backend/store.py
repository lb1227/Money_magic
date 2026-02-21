"""In-memory dataset store for MoneyMagic MVP."""

from typing import Any

DATASETS: dict[str, dict[str, Any]] = {}


def save_dataset(dataset_id: str, payload: dict[str, Any]) -> None:
    DATASETS[dataset_id] = payload


def get_dataset(dataset_id: str) -> dict[str, Any] | None:
    return DATASETS.get(dataset_id)
