"""Unit tests for change point helpers (no MCMC sampling)."""

from __future__ import annotations

import numpy as np
import pandas as pd

from src.change_point_model import (
    associate_events,
    event_impact_windows,
    ruptures_change_points,
    to_monthly,
)


def _daily_frame(n: int = 400, seed: int = 1) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2000-01-01", periods=n, freq="D")
    # Two regimes: low then high price.
    price = np.concatenate(
        [
            rng.normal(20, 2, size=n // 2),
            rng.normal(70, 5, size=n - n // 2),
        ]
    )
    price = np.clip(price, 1.0, None)
    df = pd.DataFrame({"Date": dates, "Price": price})
    df["LogReturn"] = np.log(df["Price"]).diff()
    return df


def test_to_monthly_aggregates():
    df = _daily_frame()
    monthly = to_monthly(df)
    assert len(monthly) < len(df)
    assert list(monthly.columns) == ["Date", "Price"]
    assert monthly["Price"].notna().all()


def test_ruptures_finds_breaks():
    df = _daily_frame(n=600)
    monthly = to_monthly(df)
    bkps = ruptures_change_points(monthly["Price"], n_bkps=2)
    assert len(bkps) >= 1
    assert all(0 < b < len(monthly) for b in bkps)


def test_associate_events_orders_by_distance():
    events = pd.DataFrame(
        {
            "event_date": pd.to_datetime(["2004-01-01", "2005-03-01", "2010-01-01"]),
            "event_name": ["A", "B", "C"],
            "category": ["Economic", "OPEC", "Conflict"],
            "description": ["a", "b", "c"],
            "expected_impact": ["x", "y", "z"],
        }
    )
    nearest = associate_events(pd.Timestamp("2005-02-28"), events, window_days=365)
    assert nearest.iloc[0]["event_name"] == "B"


def test_event_impact_windows():
    df = _daily_frame(n=800)
    events = pd.DataFrame(
        {
            "event_date": [df["Date"].iloc[400]],
            "event_name": ["Synthetic break"],
            "category": ["Economic"],
            "description": ["test"],
            "expected_impact": ["increase"],
        }
    )
    impact = event_impact_windows(df, events, window_days=60)
    assert len(impact) == 1
    assert "price_pct_change" in impact.columns
    # Second half of series is higher → after window should be higher.
    assert impact.iloc[0]["price_after"] > impact.iloc[0]["price_before"]
