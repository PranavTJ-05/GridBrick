from backend.app.services.normalization import normalize_actuals, parse_timestamp


def test_half_hour_actuals_are_averaged_to_hour():
    records = [
        {"startTime": "2026-01-01T10:00:00Z", "generation": 100, "fuelType": "WIND"},
        {"startTime": "2026-01-01T10:30:00Z", "generation": 140, "fuelType": "WIND"},
        {"startTime": "2026-01-01T10:00:00Z", "generation": 999, "fuelType": "SOLAR"},
    ]

    result = normalize_actuals(records)

    assert result[parse_timestamp("2026-01-01T10:00:00Z")] == 120
