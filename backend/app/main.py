from __future__ import annotations

from collections import defaultdict
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .schemas import AccuracyResponse, DecisionResponse, DecisionRow, MetricSummary
from .services.data_service import DataUnavailableError, MAX_DATE, MIN_DATE, build_rows
from .services.elexon_client import fetch_dataset_preview
from .services.metrics import summarize

app = FastAPI(title="WindReady API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


@app.get("/", include_in_schema=False)
async def frontend_index():
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"service": "windready-api", "message": "Frontend build not found; use the Vite dev server."}


def validate_date(value: str) -> date:
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Use an ISO date such as 2026-01-15") from error
    if not MIN_DATE <= parsed <= MAX_DATE:
        raise HTTPException(status_code=400, detail="The challenge scope is January 2026")
    return parsed


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "windready-api", "scope": "January 2026"}


@app.get("/api/dates")
async def dates() -> dict:
    return {"dates": [date(2026, 1, day).isoformat() for day in range(1, 32)]}


@app.get("/api/metadata")
async def metadata() -> dict:
    return {
        "actual_dataset": "FUELHH",
        "forecast_dataset": "WINDFOR",
        "actual_filter": "fuelType=WIND",
        "date_range": {"from": MIN_DATE.isoformat(), "to": MAX_DATE.isoformat()},
        "resolution": "Hourly comparison; FUELHH actuals are averaged from half-hourly records",
        "default_cutoff": "23:59 UTC on the day before delivery",
    }


async def dataset_preview(dataset: str, date_from: str, date_to: str, limit: int) -> dict:
    parsed_from = validate_date(date_from)
    parsed_to = validate_date(date_to)
    if parsed_from > parsed_to:
        raise HTTPException(status_code=400, detail="The from date must be before the to date")
    try:
        return await fetch_dataset_preview(dataset, parsed_from, parsed_to, limit=limit)
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Elexon {dataset} data is unavailable") from error


@app.get("/api/datasets/fuelhh")
async def fuelhh_preview(
    date_from: str = Query("2026-01-15", alias="from"),
    date_to: str = Query("2026-01-15", alias="to"),
    limit: int = Query(25, ge=1, le=100),
) -> dict:
    return await dataset_preview("FUELHH", date_from, date_to, limit)


@app.get("/api/datasets/windfor")
async def windfor_preview(
    date_from: str = Query("2026-01-15", alias="from"),
    date_to: str = Query("2026-01-15", alias="to"),
    limit: int = Query(25, ge=1, le=100),
) -> dict:
    return await dataset_preview("WINDFOR", date_from, date_to, limit)


@app.get("/api/decision-view", response_model=DecisionResponse)
async def decision_view(
    delivery_date: str = Query(...), cutoff: str = Query("23:59", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
) -> DecisionResponse:
    parsed_date = validate_date(delivery_date)
    try:
        rows, source, metadata = await build_rows(parsed_date, parsed_date, cutoff)
    except DataUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return DecisionResponse(
        delivery_date=parsed_date.isoformat(),
        decision_cutoff=rows[0]["decision_cutoff"] if rows else cutoff,
        resolution="hourly",
        data_source=source,
        rows=[DecisionRow(**row) for row in rows],
        metrics=MetricSummary(**summarize(rows)),
        metadata=metadata,
    )


@app.get("/api/accuracy", response_model=AccuracyResponse)
async def accuracy(
    date_from: str = Query("2026-01-01", alias="from"),
    date_to: str = Query("2026-01-31", alias="to"),
    cutoff: str = Query("23:59", pattern=r"^([01]\d|2[0-3]):[0-5]\d$"),
) -> AccuracyResponse:
    parsed_from = validate_date(date_from)
    parsed_to = validate_date(date_to)
    if parsed_from > parsed_to:
        raise HTTPException(status_code=400, detail="The from date must be before the to date")
    try:
        rows, source, metadata = await build_rows(parsed_from, parsed_to, cutoff)
    except DataUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    valid_rows = [row for row in rows if row["absolute_error_mw"] is not None]

    daily_groups: dict[str, list[dict]] = defaultdict(list)
    hourly_groups: dict[int, list[dict]] = defaultdict(list)
    for row in valid_rows:
        day = row["target_time"][:10]
        hour = int(row["target_time"][11:13])
        daily_groups[day].append(row)
        hourly_groups[hour].append(row)

    daily = [
        {"date": day, **summarize(group)}
        for day, group in sorted(daily_groups.items())
    ]
    hourly = [
        {"hour": hour, **summarize(group)}
        for hour, group in sorted(hourly_groups.items())
    ]
    distribution = [
        {"target_time": row["target_time"], "absolute_error_mw": row["absolute_error_mw"], "error_mw": row["error_mw"]}
        for row in valid_rows
    ]
    return AccuracyResponse(
        date_from=parsed_from.isoformat(),
        date_to=parsed_to.isoformat(),
        decision_cutoff=cutoff,
        data_source=source,
        metrics=MetricSummary(**summarize(rows)),
        daily=daily,
        hourly=hourly,
        distribution=distribution,
        metadata=metadata,
    )
