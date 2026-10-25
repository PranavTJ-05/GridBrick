from __future__ import annotations

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx


BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
_cache: dict[str, list[dict]] = {}


def _rows(payload: Any) -> list[dict]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        return payload.get("data", [])
    return []


async def _get(path: str, params: dict[str, str]) -> list[dict]:
    cache_key = f"{path}?{sorted(params.items())}"
    if cache_key in _cache:
        return _cache[cache_key]
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.get(f"{BASE_URL}{path}", params=params)
        response.raise_for_status()
        result = _rows(response.json())
    _cache[cache_key] = result
    return result


async def fetch_elexon_data(start: date, end: date) -> tuple[list[dict], list[dict]]:
    forecast_start = datetime.combine(start - timedelta(days=2), datetime.min.time(), tzinfo=timezone.utc)
    forecast_end = datetime.combine(end + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
    actuals, forecasts = await asyncio.gather(
        _get(
            "/datasets/FUELHH/stream",
            {
                "settlementDateFrom": start.isoformat(),
                "settlementDateTo": end.isoformat(),
                "fuelType": "WIND",
            },
        ),
        _get(
            "/datasets/WINDFOR/stream",
            {
                "publishDateTimeFrom": forecast_start.isoformat().replace("+00:00", "Z"),
                "publishDateTimeTo": forecast_end.isoformat().replace("+00:00", "Z"),
            },
        ),
    )
    return actuals, forecasts
