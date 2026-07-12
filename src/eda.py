"""Exploratory data analysis helpers for the Brent oil price series.

Provides reusable plotting and statistics functions (trend, log returns,
rolling volatility, distribution, and stationarity testing) that are shared by
the EDA notebook and the report builder.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from statsmodels.tsa.stattools import adfuller

from src.exceptions import DataValidationError
from src.logging_utils import get_logger

logger = get_logger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FIGURES_DIR = PROJECT_ROOT / "reports" / "figures"

plt.rcParams.update(
    {
        "figure.figsize": (12, 5),
        "figure.dpi": 110,
        "axes.grid": True,
        "grid.alpha": 0.3,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "font.size": 11,
    }
)


def _ensure_figures_dir() -> Path:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    return FIGURES_DIR


def _save(fig: plt.Figure, name: str) -> Path:
    _ensure_figures_dir()
    path = FIGURES_DIR / name
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_price_series(
    df: pd.DataFrame, events: pd.DataFrame | None = None, name: str = "price_series.png"
) -> Path:
    """Plot the raw Brent price over time, optionally annotating key events."""
    fig, ax = plt.subplots()
    ax.plot(df["Date"], df["Price"], color="#1f4e79", linewidth=0.9)
    ax.set_title("Brent Crude Oil Price (1987-2022)")
    ax.set_xlabel("Date")
    ax.set_ylabel("Price (USD per barrel)")
    if events is not None:
        for _, ev in events.iterrows():
            ax.axvline(
                ev["event_date"],
                color="#c0392b",
                linestyle="--",
                linewidth=0.8,
                alpha=0.5,
            )
    return _save(fig, name)


def plot_log_returns(df: pd.DataFrame, name: str = "log_returns.png") -> Path:
    """Plot daily log returns to reveal volatility clustering."""
    fig, ax = plt.subplots()
    ax.plot(df["Date"], df["LogReturn"], color="#2c3e50", linewidth=0.6)
    ax.set_title("Brent Daily Log Returns")
    ax.set_xlabel("Date")
    ax.set_ylabel("log(P_t) - log(P_{t-1})")
    return _save(fig, name)


def plot_rolling_volatility(
    df: pd.DataFrame, windows=(30, 90), name: str = "rolling_volatility.png"
) -> Path:
    """Plot rolling standard deviation of log returns for given windows."""
    fig, ax = plt.subplots()
    for w in windows:
        ax.plot(
            df["Date"],
            df["LogReturn"].rolling(w).std(),
            linewidth=0.9,
            label=f"{w}-day",
        )
    ax.set_title("Rolling Volatility of Log Returns")
    ax.set_xlabel("Date")
    ax.set_ylabel("Std. dev. of log returns")
    ax.legend()
    return _save(fig, name)


def plot_return_distribution(
    df: pd.DataFrame, name: str = "return_distribution.png"
) -> Path:
    """Plot the distribution of daily log returns."""
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(df["LogReturn"].dropna(), bins=120, color="#1f4e79", alpha=0.85)
    ax.set_title("Distribution of Daily Log Returns")
    ax.set_xlabel("Log return")
    ax.set_ylabel("Frequency")
    return _save(fig, name)


def adf_report(series: pd.Series) -> dict:
    """Run an Augmented Dickey-Fuller test and return key results.

    Raises:
        DataValidationError: if the series has too few non-null observations
            for a meaningful test.
    """
    clean = series.dropna()
    if len(clean) < 10:
        raise DataValidationError(
            f"ADF test needs at least 10 observations, got {len(clean)}."
        )
    stat, pvalue, used_lag, n_obs, crit, _ = adfuller(clean, autolag="AIC")
    return {
        "adf_statistic": float(stat),
        "p_value": float(pvalue),
        "used_lag": int(used_lag),
        "n_obs": int(n_obs),
        "critical_values": {k: float(v) for k, v in crit.items()},
        "stationary_at_5pct": bool(pvalue < 0.05),
    }


def summarize(df: pd.DataFrame) -> dict:
    """Return summary statistics used in the report narrative.

    Raises:
        DataValidationError: if expected columns are missing.
    """
    required = {"Date", "Price", "LogReturn"}
    missing = required - set(df.columns)
    if missing:
        raise DataValidationError(
            f"summarize() requires column(s) {sorted(missing)}; "
            "call add_log_returns() first."
        )
    return {
        "n_obs": int(len(df)),
        "start_date": df["Date"].min().date().isoformat(),
        "end_date": df["Date"].max().date().isoformat(),
        "min_price": float(df["Price"].min()),
        "max_price": float(df["Price"].max()),
        "mean_price": float(df["Price"].mean()),
        "adf_price": adf_report(df["Price"]),
        "adf_log_return": adf_report(df["LogReturn"]),
    }
