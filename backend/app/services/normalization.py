from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone


def parse_timestamp(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed.astimezone(timezone.utc)


def normalize_actuals(records: list[dict]) -> dict[datetime, float]:
    buckets: dict[datetime, list[float]] = defaultdict(list)
    for record in records:
        if record.get("fuelType") not in (None, "WIND"):
            continue
        timestamp = parse_timestamp(record["startTime"])
        hour = timestamp.replace(minute=0, second=0, microsecond=0)
        buckets[hour].append(float(record["generation"]))
    return {timestamp: round(sum(values) / len(values), 2) for timestamp, values in buckets.items()}


def normalize_forecasts(records: list[dict]) -> list[dict]:
    return [
        {
            "target_time": parse_timestamp(record["startTime"]),
            "published_at": parse_timestamp(record["publishTime"]),
            "forecast_mw": float(record["generation"]),
        }
        for record in records
        if record.get("startTime") and record.get("publishTime") and record.get("generation") is not None
    ]
