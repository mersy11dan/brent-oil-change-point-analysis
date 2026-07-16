# Backend (Flask API)

REST API that serves historical Brent prices, curated events, Bayesian change
point results, and per-event impact metrics to the React dashboard.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/prices?start=&end=&max_points=` | Historical prices |
| GET | `/api/log-returns?start=&end=` | Daily log returns |
| GET | `/api/events?category=` | Curated key events |
| GET | `/api/change-points` | Bayesian + ruptures results |
| GET | `/api/event-impact?category=` | Before/after event impacts |
| GET | `/api/metrics` | Dashboard KPI summary |

## Run

```bash
# From the repository root
pip install -r requirements.txt
python scripts/run_change_point.py   # once, to produce reports/model_results.json
python backend/app.py                # http://127.0.0.1:5000
```
