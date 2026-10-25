# WindReady

**Day-ahead wind intelligence for energy procurement decisions.**

WindReady is a full-stack decision-support dashboard built for the Gridbricks Software Engineering task. It helps an energy procurement team understand the wind forecast that was genuinely available before a day-ahead decision, compare it with realized national wind generation, and quantify the uncertainty around that decision.

The product is deliberately focused: it does not pretend that forecast error alone determines the final purchase volume or cost. Demand, prices, and thermal-generation data were not part of the supplied scope, so WindReady presents the wind signal and its uncertainty as an auditable input to procurement planning.

## Project walkthrough

Watch the recorded project explanation before exploring the code or the live application:

[![Watch the WindReady project walkthrough](https://img.youtube.com/vi/1AuuheRKIQY/maxresdefault.jpg)](https://www.youtube.com/watch?v=1AuuheRKIQY)

[Watch the full WindReady project explanation on YouTube](https://www.youtube.com/watch?v=1AuuheRKIQY)

## Live application

**Production:** [windready-gridbricks.onrender.com](https://windready-gridbricks.onrender.com)

The deployed application serves the React dashboard and FastAPI API from one Docker web service. It uses same-origin API requests in production and displays the source as **Elexon BMRS** when the live data has been loaded successfully.

## What the dashboard does

- Select a delivery date within January 2026.
- Set the decision cutoff time used to select the eligible forecast vintage.
- Compare the selected forecast with realized hourly wind generation.
- Inspect forecast publication time and lead time for each delivery period.
- Review MAE, RMSE, WAPE, bias, underforecast rate, and P90 absolute error.
- Explore daily forecast quality, intraday bias, and the month-wide error distribution.
- Inspect the underlying FUELHH and WINDFOR dataset previews through the FastAPI documentation.
- Show an explicit source-unavailable error when Elexon cannot be reached; no synthetic or dummy fallback data is used.

## The key product decision

WindReady does not simply compare the latest forecast with the actual result. For every delivery hour, it reconstructs the latest forecast that had been published **on or before the selected decision cutoff**.

The selection rule is:

```text
forecast target time = delivery time
forecast publication time <= decision cutoff
select the latest eligible publication
```

This prevents the dashboard from using information that would not have been available to the buyer when the purchasing decision was made.

## Data sources

WindReady uses live Elexon BMRS data:

| Dataset | Purpose | Application treatment |
| --- | --- | --- |
| `FUELHH` | Half-hourly generation outturn by fuel type | Filtered to `fuelType=WIND`, then averaged into hourly actuals |
| `WINDFOR` | Wind-generation forecasts | Matched to delivery hours and filtered by forecast publication cutoff |

The upstream API endpoints are:

- [`FUELHH` stream](https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream)
- [`WINDFOR` stream](https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream)

The original documentation pages are available from the [Elexon BMRS API documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream).

## API overview

The public FastAPI application exposes the dashboard data and small, recruiter-friendly dataset previews:

```text
GET /api/health
GET /api/metadata
GET /api/decision-view?delivery_date=2026-01-15&cutoff=23:59
GET /api/accuracy?from=2026-01-01&to=2026-01-31&cutoff=23:59
GET /api/datasets/fuelhh?from=2026-01-15&to=2026-01-15&limit=5
GET /api/datasets/windfor?from=2026-01-15&to=2026-01-15&limit=5
```

Open the interactive API documentation at:

```text
https://windready-gridbricks.onrender.com/docs
```

The dataset preview endpoints return the source URL, the exact query used, the number of records received, and a small sample of real upstream rows. They are intended to make the data lineage easy to demonstrate during a review or video walkthrough.

## Accuracy metrics

The dashboard uses the following metrics:

- **MAE — Mean Absolute Error:** typical absolute size of the forecast miss.
- **RMSE — Root Mean Square Error:** emphasizes larger misses.
- **Bias:** average signed error, calculated as `forecast - actual`.
- **WAPE — Weighted Absolute Percentage Error:** total absolute error divided by total actual generation.
- **Underforecast rate:** proportion of valid periods where `forecast < actual`.
- **P90 absolute error:** the 90th-percentile absolute miss, used as a practical planning reference.

## Architecture

```text
React + TypeScript dashboard
            │
            │ REST/JSON
            ▼
FastAPI application
            │
            ├── Elexon client
            ├── Timestamp normalization
            ├── Half-hourly → hourly actual aggregation
            ├── Latest eligible forecast-vintage selection
            └── Forecast metrics and grouped accuracy summaries
```

The backend is the only component that communicates with Elexon. The frontend consumes typed application responses, keeping source-specific filtering and business rules out of the browser.

## Technology stack

- **Frontend:** React, TypeScript, Vite, Recharts
- **Backend:** Python, FastAPI, Pydantic, httpx
- **Validation and testing:** Pytest, TypeScript build checks
- **Packaging:** Docker, Docker Compose
- **Deployment:** Render Docker Web Service

## Repository structure

```text
backend/app/              FastAPI routes, schemas, data services, and metrics
backend/tests/            Tests for selection, normalization, metrics, and source failures
frontend/src/              React dashboard, charts, API client, and visual system
Dockerfile                Multi-stage production image
docker-compose.yml        Local development setup
```

## Run locally

### Backend and frontend without Docker

Create a Python environment and start the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

In a second terminal, install and start the frontend:

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

Open [http://localhost:5173](http://localhost:5173).

### Docker Compose

```bash
docker compose up --build
```

## Production deployment

The production `Dockerfile` uses a multi-stage build:

1. Install frontend dependencies and build the React application.
2. Install Python dependencies.
3. Copy the compiled frontend into the backend image.
4. Start FastAPI on Render's supplied `PORT`.
5. Serve the dashboard and API from the same public origin.

For a Render deployment, select the repository's `main` branch and deploy it as a Docker Web Service using `./Dockerfile`. The combined deployment keeps frontend routing and API requests together and avoids production cross-origin configuration.

## Verification commands

Run the backend tests and frontend production build from the repository root:

```bash
pytest -q backend/tests
npm run build --prefix frontend
python3 -m compileall -q backend
git diff --check
```

Verify the deployed service directly:

```bash
curl --fail https://windready-gridbricks.onrender.com/api/health
curl --fail "https://windready-gridbricks.onrender.com/api/decision-view?delivery_date=2026-01-15&cutoff=23:59"
curl --fail "https://windready-gridbricks.onrender.com/api/accuracy?from=2026-01-01&to=2026-01-31&cutoff=23:59"
```

Successful data responses should identify:

```json
"data_source": "Elexon BMRS"
```

If Elexon is unavailable, the backend returns HTTP `503` and the frontend shows an explicit source-unavailable state. The application never substitutes dummy, generated, or synthetic market data.

## Scope and assumptions

- Delivery dates are limited to January 1–31, 2026 to match the task scope.
- The default cutoff is `23:59 UTC` on the day before delivery; the UI keeps it configurable because the task does not specify a market gate-closure time.
- FUELHH half-hourly actuals are averaged into hourly values for comparison with the forecast series.
- Forecast selection uses publication time, not just forecast target time.
- Demand, electricity prices, thermal availability, and final procurement cost are outside the supplied scope.
