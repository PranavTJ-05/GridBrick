from __future__ import annotations

from datetime import datetime


def select_latest_forecast(
    forecasts: list[dict], target_time: datetime, cutoff: datetime
) -> dict | None:
    candidates = []
    for forecast in forecasts:
        if forecast["target_time"] != target_time:
            continue
        if forecast["published_at"] <= cutoff:
            candidates.append(forecast)
    return max(candidates, key=lambda item: item["published_at"]) if candidates else None
