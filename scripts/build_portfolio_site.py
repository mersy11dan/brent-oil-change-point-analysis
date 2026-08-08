"""Build a static, portfolio-ready website into ``docs/`` for GitHub Pages.

Copies figures, exports chart-ready JSON (prices, events, model results), and
writes a polished single-page case study site that needs no Flask/React server.

Run from the repository root::

    python scripts/build_portfolio_site.py
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data_loader import add_log_returns, load_events, load_prices  # noqa: E402

DOCS = PROJECT_ROOT / "docs"
ASSETS = DOCS / "assets"
DATA_DIR = DOCS / "data"
FIGURES_SRC = PROJECT_ROOT / "reports" / "figures"
RESULTS_SRC = PROJECT_ROOT / "reports" / "model_results.json"
SCREENSHOTS_SRC = PROJECT_ROOT / "reports" / "screenshots"


def export_data() -> dict:
    prices = add_log_returns(load_prices())
    events = load_events()
    results = json.loads(RESULTS_SRC.read_text(encoding="utf-8"))

    # Downsample daily prices for browser charts (~900 points).
    step = max(1, len(prices) // 900)
    price_rows = [
        {
            "date": row.Date.date().isoformat(),
            "price": round(float(row.Price), 2),
        }
        for row in prices.iloc[::step].itertuples()
    ]

    # Monthly means for a smoother overview series.
    monthly = (
        prices.set_index("Date")["Price"]
        .resample("ME")
        .mean()
        .dropna()
        .reset_index()
    )
    monthly_rows = [
        {
            "date": row.Date.date().isoformat(),
            "price": round(float(row.Price), 2),
        }
        for row in monthly.itertuples()
    ]

    event_rows = [
        {
            "event_date": row.event_date.date().isoformat(),
            "event_name": row.event_name,
            "category": row.category,
            "description": row.description,
            "expected_impact": row.expected_impact,
        }
        for row in events.itertuples()
    ]

    # Rolling volatility sample for a second chart.
    vol = prices[["Date", "LogReturn"]].copy()
    vol["vol30"] = vol["LogReturn"].rolling(30).std()
    vol = vol.dropna().iloc[::step]
    vol_rows = [
        {
            "date": row.Date.date().isoformat(),
            "vol30": round(float(row.vol30), 5),
        }
        for row in vol.itertuples()
    ]

    payload = {
        "metrics": {
            "n_obs": int(len(prices)),
            "start_date": prices["Date"].min().date().isoformat(),
            "end_date": prices["Date"].max().date().isoformat(),
            "min_price": round(float(prices["Price"].min()), 2),
            "max_price": round(float(prices["Price"].max()), 2),
            "mean_price": round(float(prices["Price"].mean()), 2),
            "latest_price": round(float(prices["Price"].iloc[-1]), 2),
            "volatility": round(float(prices["LogReturn"].std()), 4),
            "n_events": len(event_rows),
        },
        "prices": price_rows,
        "monthly_prices": monthly_rows,
        "volatility": vol_rows,
        "events": event_rows,
        "results": results,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / "site_data.json"
    out.write_text(json.dumps(payload), encoding="utf-8")
    return payload


def copy_assets() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for name in (
        "price_series.png",
        "log_returns.png",
        "rolling_volatility.png",
        "return_distribution.png",
        "cp_price_regimes.png",
        "cp_tau_posterior.png",
        "cp_trace.png",
    ):
        src = FIGURES_SRC / name
        if src.exists():
            shutil.copy2(src, ASSETS / name)

    shots = ASSETS / "screenshots"
    shots.mkdir(exist_ok=True)
    if SCREENSHOTS_SRC.exists():
        for png in SCREENSHOTS_SRC.glob("*.png"):
            shutil.copy2(png, shots / png.name)


def main() -> None:
    DOCS.mkdir(parents=True, exist_ok=True)
    payload = export_data()
    copy_assets()
    print(f"Exported site data: {len(payload['prices']):,} price points")
    print(f"Events: {payload['metrics']['n_events']}")
    print(f"Assets -> {ASSETS}")
    print(f"Open docs/index.html or deploy docs/ via GitHub Pages.")


if __name__ == "__main__":
    main()
