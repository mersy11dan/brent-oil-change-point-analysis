"""Unit tests for the EDA helper functions."""

from __future__ import annotations

import numpy as np
import pandas as pd

from src import eda


def _synthetic_series(n: int = 500, seed: int = 0) -> pd.DataFrame:
    """Build a synthetic price/log-return frame for deterministic testing."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2000-01-01", periods=n, freq="D")
    # Random-walk price (non-stationary) with positive drift.
    price = 50 + np.cumsum(rng.normal(0.05, 1.0, size=n))
    price = np.clip(price, 1.0, None)
    df = pd.DataFrame({"Date": dates, "Price": price})
    df["LogPrice"] = np.log(df["Price"])
    df["LogReturn"] = df["LogPrice"].diff()
    return df


def test_adf_report_keys_and_types():
    df = _synthetic_series()
    report = eda.adf_report(df["LogReturn"])
    assert set(report) >= {
        "adf_statistic",
        "p_value",
        "used_lag",
        "n_obs",
        "critical_values",
        "stationary_at_5pct",
    }
    assert isinstance(report["stationary_at_5pct"], bool)
    assert 0.0 <= report["p_value"] <= 1.0


def test_adf_price_nonstationary_returns_stationary():
    df = _synthetic_series(n=800)
    price_report = eda.adf_report(df["Price"])
    return_report = eda.adf_report(df["LogReturn"])
    # A random walk should be far more stationary in differences than in levels.
    assert return_report["p_value"] < price_report["p_value"]


def test_summarize_shape():
    df = _synthetic_series()
    summary = eda.summarize(df)
    assert summary["n_obs"] == len(df)
    assert summary["min_price"] <= summary["mean_price"] <= summary["max_price"]
    assert "adf_price" in summary and "adf_log_return" in summary
