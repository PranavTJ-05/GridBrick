# WindReady

WindReady is a React and Python decision-support prototype for a UK energy procurement team. It compares Elexon's national wind-generation forecasts with wind-generation actuals for January 2026 and exposes the forecast vintage that was available before a day-ahead decision cutoff.

## Product scope

- View the latest forecast available before a configurable cutoff for a selected delivery date.
- Compare hourly forecast wind generation with hourly actual wind generation.
- Quantify forecast quality using MAE, RMSE, WAPE, bias, underforecast rate, and P90 absolute error.
- Keep the limitation visible: demand, prices, and thermal generation were not supplied, so this prototype measures wind forecast uncertainty rather than final procurement volume or cost.

## Business problem solved

An energy procurement team must decide how much power to buy for the next delivery day before the day arrives. Wind generation is uncertain, so the team needs two things: the newest forecast that was available at the decision time and a quantified view of how much that type of forecast has missed historically. WindReady provides that evidence for January 2026 without pretending that wind forecast error alone is the final procurement requirement.

## Stack

- Frontend: React, TypeScript, Vite, Recharts
- Backend: Python, FastAPI, httpx
- Deployment shape: Docker Compose locally; frontend and API can be deployed separately or served behind one reverse proxy.

## Repository structure

```text
backend/app/              FastAPI application and data/metric services
backend/tests/            Unit tests for selection, normalization, and metrics
frontend/src/              React dashboard
scripts/                  Data preparation helpers
docker-compose.yml         Local two-container development setup
```

## Start locally

### Without Docker

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

In a second terminal:

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

Open <http://localhost:5173>.

### With Docker

```bash
docker compose up --build
```

Open <http://localhost:5173>.

## Production deployment

The repository includes a production Docker image that serves the built React application and FastAPI API from one process. This is the simplest deployment shape for the challenge because it produces one public URL and keeps the browser/API routing together.

### Heroku Container Registry

Heroku's Docker runtime provides the web process port through the `PORT` environment variable. The production image uses that variable and falls back to `8000` only for local execution. Heroku's current container deployment flow is:

```bash
heroku login
heroku create windready-your-name --stack container
heroku container:login
heroku container:push web --app windready-your-name
heroku container:release web --app windready-your-name
heroku open --app windready-your-name
```

If you are building on an ARM machine, build the image for Heroku's supported `linux/amd64` architecture:

```bash
docker build --platform linux/amd64 -t windready:latest .
```

Before submitting, verify the public application and API directly:

```bash
curl --fail https://windready-your-name.herokuapp.com/api/health
curl --fail "https://windready-your-name.herokuapp.com/api/decision-view?delivery_date=2026-01-15&cutoff=23:59"
```

The deployment must show `data_source` as `Elexon BMRS`. If Elexon is unavailable, the API must return an explicit `503` instead of showing replacement data.

The alternative is to deploy the React and FastAPI services separately on Vercel. For this repository, the combined Heroku Docker deployment is recommended because it needs one URL, one build, and no cross-origin production configuration.

## Deployment link

Add the final public URL here before submitting the challenge:

```text
https://<your-heroku-app>.herokuapp.com
```

## Tests

```bash
pytest -q backend/tests
npm run build --prefix frontend
```

## Data and assumptions

- Actuals come from the Elexon `FUELHH` dataset filtered to `fuelType=WIND`.
- Forecasts come from the Elexon `WINDFOR` dataset.
- Delivery dates are constrained to January 2026 to match the challenge.
- Actual half-hourly values are averaged into hourly values to align with the hourly forecast series.
- The default decision cutoff is `23:59 UTC` on the day before delivery. The UI allows the cutoff to be changed because the challenge does not define a market gate-closure time.
- The backend caches successful API responses in memory for the process lifetime. If Elexon is unavailable, the API returns HTTP 503 and the UI shows an explicit source-unavailable error; it never substitutes synthetic or dummy values.

## Source links and fields

The challenge documentation pages are:

```text
https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream
https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream
```

The application calls the current Elexon Insights REST API behind those documentation pages:

```text
https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream
https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream
```

`FUELHH` supplies half-hourly generation outturn by fuel type. Wind rows are selected with `fuelType=WIND`; `startTime` identifies the delivery interval and `generation` is the wind output. `WINDFOR` supplies forecast values; `startTime` identifies the forecast target interval, `publishTime` identifies when that forecast became available, and `generation` is the forecasted wind output. The selection logic uses `publishTime`, not just the target interval, so it can reconstruct what was knowable before the decision cutoff.

## Architecture

```text
React + Recharts UI
        │ REST/JSON
        ▼
FastAPI application
        │
        ├── Elexon client: fetches FUELHH and WINDFOR
        ├── Normalization: converts timestamps and averages FUELHH to hourly
        ├── Forecast selection: chooses latest eligible vintage before cutoff
        └── Metrics: calculates error and accuracy summaries
```

The backend is the only component that talks to Elexon. The frontend only consumes typed application responses, which keeps source-specific filtering and business rules out of the browser.

## AI assistance disclosure

AI assistance was used for project scaffolding, implementation support, and documentation drafting. Data interpretation, forecast-selection logic, tests, and the final product decisions were reviewed as part of the implementation.
