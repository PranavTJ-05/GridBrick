from backend.app.services.metrics import add_error_fields, summarize


def test_metric_summary_uses_forecast_minus_actual_error():
    rows = [
        add_error_fields({"forecast_mw": 100, "actual_mw": 110}),
        add_error_fields({"forecast_mw": 200, "actual_mw": 180}),
    ]

    result = summarize(rows)

    assert result["sample_count"] == 2
    assert result["mae_mw"] == 15
    assert result["bias_mw"] == 5
    assert result["underforecast_rate"] == 0.5


def test_metric_summary_ignores_missing_pairs():
    result = summarize([{"forecast_mw": None, "actual_mw": 100}])

    assert result["sample_count"] == 0
    assert result["mae_mw"] is None
