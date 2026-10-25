from __future__ import annotations

import math
from statistics import mean
from typing import Iterable


def _valid_rows(rows: Iterable[dict]) -> list[dict]:
    return [
        row
        for row in rows
        if row.get("forecast_mw") is not None and row.get("actual_mw") is not None
    ]


def summarize(rows: Iterable[dict]) -> dict:
    valid = _valid_rows(rows)
    if not valid:
        return {
            "sample_count": 0,
            "mae_mw": None,
            "rmse_mw": None,
            "bias_mw": None,
            "wape": None,
            "underforecast_rate": None,
            "p90_absolute_error_mw": None,
        }

    errors = [float(row["forecast_mw"]) - float(row["actual_mw"]) for row in valid]
    absolute_errors = [abs(error) for error in errors]
    squared_errors = [error**2 for error in errors]
    total_actual = sum(float(row["actual_mw"]) for row in valid)
    sorted_absolute = sorted(absolute_errors)
    percentile_index = min(len(sorted_absolute) - 1, math.ceil(0.9 * len(sorted_absolute)) - 1)

    return {
        "sample_count": len(valid),
        "mae_mw": round(mean(absolute_errors), 2),
        "rmse_mw": round(math.sqrt(mean(squared_errors)), 2),
        "bias_mw": round(mean(errors), 2),
        "wape": round(sum(absolute_errors) / total_actual, 4) if total_actual else None,
        "underforecast_rate": round(
            sum(1 for error in errors if error < 0) / len(errors), 4
        ),
        "p90_absolute_error_mw": round(sorted_absolute[percentile_index], 2),
    }


def add_error_fields(row: dict) -> dict:
    forecast = row.get("forecast_mw")
    actual = row.get("actual_mw")
    if forecast is None or actual is None:
        row.update({"error_mw": None, "absolute_error_mw": None})
        return row
    error = float(forecast) - float(actual)
    row.update({"error_mw": round(error, 2), "absolute_error_mw": round(abs(error), 2)})
    return row
