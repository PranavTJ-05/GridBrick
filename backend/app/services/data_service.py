from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from .elexon_client import fetch_elexon_data
from .forecast_selection import select_latest_forecast
from .metrics import add_error_fields, summarize
from .normalization import normalize_actuals, normalize_forecasts


MIN_DATE = date(2026, 1, 1)
MAX_DATE = date(2026, 1, 31)


class DataUnavailableError(RuntimeError):
    """Raised when the required Elexon source cannot be read or normalized."""


def parse_cutoff(delivery_date: date, cutoff: str) -> datetime:
    hour, minute = (int(part) for part in cutoff.split(":", 1))
    return datetime.combine(
        delivery_date - timedelta(days=1), time(hour=hour, minute=minute), tzinfo=timezone.utc
    )


async def build_rows(start: date, end: date, cutoff: str) -> tuple[list[dict], str, dict[str, Any]]:
    try:
        actual_records, forecast_records = await fetch_elexon_data(start, end)
        actuals = normalize_actuals(actual_records)
        forecasts = normalize_forecasts(forecast_records)
        rows = []
        current = datetime.combine(start, time.min, tzinfo=timezone.utc)
        end_time = datetime.combine(end + timedelta(days=1), time.min, tzinfo=timezone.utc)
        while current < end_time:
            decision_cutoff = parse_cutoff(current.date(), cutoff)
            selected = select_latest_forecast(forecasts, current, decision_cutoff)
            actual = actuals.get(current)
            forecast = selected["forecast_mw"] if selected else None
            publish_time = selected["published_at"] if selected else None
            lead_time = (
                round((current - publish_time).total_seconds() / 3600, 2)
                if publish_time
                else None
            )
            status = (
                "Missing forecast"
                if forecast is None
                else "Underforecast"
                if actual is not None and forecast < actual
                else "Overforecast"
                if actual is not None
                else "Missing actual"
            )
            row = {
                "target_time": current.isoformat().replace("+00:00", "Z"),
                "forecast_mw": forecast,
                "actual_mw": actual,
                "forecast_publish_time": publish_time.isoformat().replace("+00:00", "Z") if publish_time else None,
                "decision_cutoff": decision_cutoff.isoformat().replace("+00:00", "Z"),
                "lead_time_hours": lead_time,
                "status": status,
            }
            rows.append(add_error_fields(row))
            current += timedelta(hours=1)
        metadata = {
            "actual_record_count": len(actual_records),
            "forecast_record_count": len(forecast_records),
            "normalization": "FUELHH half-hourly actuals averaged to hourly values",
        }
        return rows, "Elexon BMRS", metadata
    except Exception as error:  # pragma: no cover - exercised by network failure
        raise DataUnavailableError(
            "Elexon FUELHH/WINDFOR data could not be loaded or normalized."
        ) from error


def filter_rows(rows: list[dict], start: date, end: date) -> list[dict]:
    start_time = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_time = datetime.combine(end + timedelta(days=1), time.min, tzinfo=timezone.utc)
    return [
        row
        for row in rows
        if start_time <= datetime.fromisoformat(row["target_time"].replace("Z", "+00:00")) < end_time
    ]
