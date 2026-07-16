"""Flask API serving Brent oil analysis results for the dashboard.

Endpoints
---------
GET /api/health              - Liveness check
GET /api/prices              - Historical price series (optional start/end)
GET /api/log-returns         - Daily log returns
GET /api/events              - Curated key events
GET /api/change-points       - Bayesian + ruptures change point results
GET /api/event-impact        - Per-event before/after price & volatility
GET /api/metrics             - Summary KPIs for the dashboard header
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data_loader import add_log_returns, load_events, load_prices  # noqa: E402

RESULTS_PATH = PROJECT_ROOT / "reports" / "model_results.json"

app = Flask(__name__)
CORS(app)

# Cache loaded frames in memory for fast repeated requests.
_cache: dict = {}


def _prices():
    if "prices" not in _cache:
        _cache["prices"] = add_log_returns(load_prices())
    return _cache["prices"]


def _events():
    if "events" not in _cache:
        _cache["events"] = load_events()
    return _cache["events"]


def _results() -> dict:
    if not RESULTS_PATH.exists():
        return {}
    if "results" not in _cache:
        _cache["results"] = json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
    return _cache["results"]


def _parse_date(value: str | None):
    if not value:
        return None
    return datetime.fromisoformat(value).date()


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "brent-oil-api"})


@app.get("/api/prices")
def prices():
    """Return historical prices, optionally filtered by start/end (YYYY-MM-DD)."""
    df = _prices()
    start = _parse_date(request.args.get("start"))
    end = _parse_date(request.args.get("end"))

    mask = [True] * len(df)
    if start is not None:
        mask = df["Date"].dt.date >= start
    if end is not None:
        mask = mask & (df["Date"].dt.date <= end)

    subset = df.loc[mask, ["Date", "Price"]]
    # Downsample for chart performance when the range is large.
    max_points = int(request.args.get("max_points", 1500))
    if len(subset) > max_points:
        step = max(1, len(subset) // max_points)
        subset = subset.iloc[::step]

    records = [
        {"date": row.Date.date().isoformat(), "price": round(float(row.Price), 2)}
        for row in subset.itertuples()
    ]
    return jsonify({"count": len(records), "data": records})


@app.get("/api/log-returns")
def log_returns():
    df = _prices().dropna(subset=["LogReturn"])
    start = _parse_date(request.args.get("start"))
    end = _parse_date(request.args.get("end"))
    if start is not None:
        df = df[df["Date"].dt.date >= start]
    if end is not None:
        df = df[df["Date"].dt.date <= end]

    max_points = int(request.args.get("max_points", 1500))
    if len(df) > max_points:
        step = max(1, len(df) // max_points)
        df = df.iloc[::step]

    records = [
        {
            "date": row.Date.date().isoformat(),
            "log_return": round(float(row.LogReturn), 6),
        }
        for row in df.itertuples()
    ]
    return jsonify({"count": len(records), "data": records})


@app.get("/api/events")
def events():
    """Return curated events, optionally filtered by category."""
    ev = _events()
    category = request.args.get("category")
    if category:
        ev = ev[ev["category"].str.lower() == category.lower()]

    records = [
        {
            "event_date": row.event_date.date().isoformat(),
            "event_name": row.event_name,
            "category": row.category,
            "description": row.description,
            "expected_impact": row.expected_impact,
        }
        for row in ev.itertuples()
    ]
    return jsonify({"count": len(records), "data": records})


@app.get("/api/change-points")
def change_points():
    results = _results()
    if not results:
        return jsonify(
            {
                "error": "Model results not found. Run: python scripts/run_change_point.py"
            }
        ), 404
    return jsonify(
        {
            "bayesian": results.get("bayesian_change_point", {}),
            "ruptures": results.get("ruptures_change_points", []),
            "nearest_events": results.get("nearest_events", []),
            "convergence_summary": results.get("convergence_summary", []),
        }
    )


@app.get("/api/event-impact")
def event_impact():
    results = _results()
    impact = results.get("event_impact", [])
    category = request.args.get("category")
    if category:
        impact = [
            row
            for row in impact
            if row.get("category", "").lower() == category.lower()
        ]
    return jsonify({"count": len(impact), "data": impact})


@app.get("/api/metrics")
def metrics():
    """Key indicators for the dashboard header."""
    df = _prices()
    results = _results()
    bayesian = results.get("bayesian_change_point", {})
    impact = results.get("event_impact", [])

    avg_abs_pct = (
        sum(abs(r["price_pct_change"]) for r in impact) / len(impact) if impact else 0
    )
    return jsonify(
        {
            "n_obs": int(len(df)),
            "start_date": df["Date"].min().date().isoformat(),
            "end_date": df["Date"].max().date().isoformat(),
            "min_price": round(float(df["Price"].min()), 2),
            "max_price": round(float(df["Price"].max()), 2),
            "mean_price": round(float(df["Price"].mean()), 2),
            "latest_price": round(float(df["Price"].iloc[-1]), 2),
            "volatility": round(float(df["LogReturn"].std()), 4),
            "n_events": int(len(_events())),
            "bayesian_tau": bayesian.get("tau_date"),
            "bayesian_pct_change": bayesian.get("pct_change"),
            "avg_abs_event_impact_pct": round(avg_abs_pct, 1),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
