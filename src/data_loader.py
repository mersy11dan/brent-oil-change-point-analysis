"""Data loading and cleaning utilities for the Brent oil price dataset.

The raw dataset mixes two date formats (e.g. ``20-May-87`` in early rows and
``Nov 09, 2022`` in later rows), so parsing is handled defensively here so the
rest of the project can rely on a clean, sorted, datetime-indexed series.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_PRICE_PATH = PROJECT_ROOT / "data" / "raw" / "BrentOilPrices.csv"
RAW_EVENTS_PATH = PROJECT_ROOT / "data" / "raw" / "key_events.csv"
PROCESSED_PRICE_PATH = PROJECT_ROOT / "data" / "processed" / "brent_clean.csv"


def parse_dates(date_series: pd.Series) -> pd.Series:
    """Parse a column of mixed-format date strings into datetimes.

    Tries a fast vectorized parse first and falls back to a flexible
    per-element parse for any values that fail, which covers the two formats
    present in the source file.
    """
    parsed = pd.to_datetime(date_series, format="mixed", dayfirst=True, errors="coerce")
    if parsed.isna().any():
        fallback = pd.to_datetime(
            date_series[parsed.isna()], errors="coerce", dayfirst=True
        )
        parsed.loc[parsed.isna()] = fallback
    return parsed


def load_prices(path: str | Path = RAW_PRICE_PATH) -> pd.DataFrame:
    """Load and clean the Brent oil price series.

    Returns a DataFrame with a sorted ``Date`` (datetime) column, numeric
    ``Price``, and duplicate/invalid rows removed.
    """
    df = pd.read_csv(path)
    df.columns = [c.strip().capitalize() for c in df.columns]
    df["Date"] = parse_dates(df["Date"])
    df["Price"] = pd.to_numeric(df["Price"], errors="coerce")
    df = (
        df.dropna(subset=["Date", "Price"])
        .drop_duplicates(subset="Date")
        .sort_values("Date")
        .reset_index(drop=True)
    )
    return df


def add_log_returns(df: pd.DataFrame) -> pd.DataFrame:
    """Add ``LogPrice`` and ``LogReturn`` columns to a price DataFrame."""
    out = df.copy()
    out["LogPrice"] = np.log(out["Price"])
    out["LogReturn"] = out["LogPrice"].diff()
    return out


def load_events(path: str | Path = RAW_EVENTS_PATH) -> pd.DataFrame:
    """Load the curated key-events dataset with parsed ``event_date``."""
    events = pd.read_csv(path)
    events["event_date"] = pd.to_datetime(events["event_date"], errors="coerce")
    return events.sort_values("event_date").reset_index(drop=True)


def save_processed(df: pd.DataFrame, path: str | Path = PROCESSED_PRICE_PATH) -> Path:
    """Persist the cleaned price series (with log returns) to ``data/processed``."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


if __name__ == "__main__":
    prices = add_log_returns(load_prices())
    out_path = save_processed(prices)
    print(f"Loaded {len(prices):,} rows spanning "
          f"{prices['Date'].min().date()} to {prices['Date'].max().date()}")
    print(f"Saved cleaned data to {out_path}")
