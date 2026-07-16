"""Fit the Bayesian change point model and export results + figures.

Run from the repository root::

    python scripts/run_change_point.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import arviz as az
import pandas as pd

from src import change_point_model as cp
from src.data_loader import add_log_returns, load_events, load_prices


def main() -> None:
    print("Loading data...")
    df = add_log_returns(load_prices())
    events = load_events()
    monthly = cp.to_monthly(df)
    print(f"Daily rows: {len(df):,} | Monthly points: {len(monthly)}")

    print("Sampling Bayesian change point model (this may take a few minutes)...")
    _model, trace = cp.build_and_sample(
        monthly["Price"],
        monthly["Date"],
        draws=1000,
        tune=1000,
        chains=2,
        target_accept=0.9,
        random_seed=42,
    )

    summary = az.summary(trace, var_names=["tau", "mu_1", "mu_2", "sigma"])
    print("\nConvergence summary:")
    print(summary)

    result = cp.summarize_result(trace, monthly["Date"])
    print(f"\nChange point (median tau): {result.tau_date.date()}")
    print(
        f"95% CI: {result.tau_hdi[0].date()} to {result.tau_hdi[1].date()}"
    )
    print(
        f"Mean before: ${result.mu_before:.2f} | Mean after: ${result.mu_after:.2f}"
    )
    print(
        f"Change: {result.pct_change:+.1f}% | P(mu_2 > mu_1) = {result.prob_increase:.3f}"
    )

    print("Generating figures...")
    cp.plot_trace(trace, ["tau", "mu_1", "mu_2", "sigma"])
    cp.plot_tau_posterior(trace, monthly["Date"])

    rupt_idx = cp.ruptures_change_points(monthly["Price"], n_bkps=5)
    rupt_dates = [monthly["Date"].iloc[i] for i in rupt_idx]
    print("Ruptures dates:", [d.date().isoformat() for d in rupt_dates])
    cp.plot_price_with_changepoints(monthly, result, extra_cp_dates=rupt_dates)

    impact = cp.event_impact_windows(df, events, window_days=90)
    print("\nEvent impacts (90-day windows):")
    print(impact.to_string(index=False))

    nearest = cp.associate_events(result.tau_date, events, window_days=365)
    nearest_records = nearest[
        ["event_date", "event_name", "category", "days_from_tau"]
    ].head(5)
    nearest_records = nearest_records.copy()
    nearest_records["event_date"] = nearest_records["event_date"].dt.date.astype(
        str
    )

    results = {
        "generated_at": pd.Timestamp.now().isoformat(),
        "data": {
            "n_daily": int(len(df)),
            "n_monthly": int(len(monthly)),
            "start_date": df["Date"].min().date().isoformat(),
            "end_date": df["Date"].max().date().isoformat(),
        },
        "bayesian_change_point": {
            "tau_date": result.tau_date.date().isoformat(),
            "tau_hdi": [
                result.tau_hdi[0].date().isoformat(),
                result.tau_hdi[1].date().isoformat(),
            ],
            "mu_before": round(result.mu_before, 2),
            "mu_after": round(result.mu_after, 2),
            "mu_before_hdi": [round(x, 2) for x in result.mu_before_hdi],
            "mu_after_hdi": [round(x, 2) for x in result.mu_after_hdi],
            "pct_change": round(result.pct_change, 1),
            "prob_increase": round(result.prob_increase, 4),
            "r_hat": {
                k: round(float(summary.loc[k, "r_hat"]), 3)
                for k in ["tau", "mu_1", "mu_2", "sigma"]
                if k in summary.index
            },
        },
        "nearest_events": nearest_records.to_dict(orient="records"),
        "ruptures_change_points": [d.date().isoformat() for d in rupt_dates],
        "event_impact": impact.to_dict(orient="records"),
        "convergence_summary": summary.reset_index().to_dict(orient="records"),
    }

    out_path = PROJECT_ROOT / "reports" / "model_results.json"
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nWrote {out_path}")

    # Also save a compact CSV for the dashboard / report.
    impact_path = PROJECT_ROOT / "data" / "processed" / "event_impact.csv"
    impact_path.parent.mkdir(parents=True, exist_ok=True)
    impact.to_csv(impact_path, index=False)
    print(f"Wrote {impact_path}")


if __name__ == "__main__":
    main()
