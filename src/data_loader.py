"""Data loading and cleaning utilities for the Brent oil price dataset.

The raw dataset mixes two date formats (e.g. ``20-May-87`` in early rows and
``Nov 09, 2022`` in later rows), so parsing is handled defensively here so the
rest of the project can rely on a clean, sorted, datetime-indexed series.

Every public loader validates its inputs and raises a typed error
(:class:`~src.exceptions.DataFileNotFoundError` or
:class:`~src.exceptions.DataValidationError`) with an actionable message, and
logs a short summary of what was loaded.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from src.exceptions import DataFileNotFoundError, DataValidationError
from src.logging_utils import get_logger

logger = get_logger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_PRICE_PATH = PROJECT_ROOT / "data" / "raw" / "BrentOilPrices.csv"
RAW_EVENTS_PATH = PROJECT_ROOT / "data" / "raw" / "key_events.csv"
PROCESSED_PRICE_PATH = PROJECT_ROOT / "data" / "processed" / "brent_clean.csv"

REQUIRED_PRICE_COLUMNS = {"Date", "Price"}
REQUIRED_EVENT_COLUMNS = {
    "event_date",
    "event_name",
    "category",
    "description",
    "expected_impact",
}


def _read_csv(path: str | Path, *, label: str) -> pd.DataFrame:
    """Read a CSV into a DataFrame, raising typed errors on common failures.

    Centralizes the file-existence and empty-file checks so every loader
    reports missing or corrupt inputs consistently.
    """
    path = Path(path)
    if not path.exists():
        raise DataFileNotFoundError(
            f"{label} file not found at '{path}'. "
            "Ensure the dataset is present under data/raw/."
        )
    try:
        df = pd.read_csv(path)
    except pd.errors.EmptyDataError as exc:
        raise DataValidationError(f"{label} file at '{path}' is empty.") from exc
    if df.empty:
        raise DataValidationError(f"{label} file at '{path}' contains no rows.")
    return df


def _require_columns(df: pd.DataFrame, required: set[str], *, label: str) -> None:
    """Raise :class:`DataValidationError` if any required column is missing."""
    missing = required - set(df.columns)
    if missing:
        raise DataValidationError(
            f"{label} is missing required column(s): {sorted(missing)}. "
            f"Found columns: {list(df.columns)}."
        )


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

    Raises:
        DataFileNotFoundError: if the source CSV is missing.
        DataValidationError: if required columns are absent or no valid rows
            remain after cleaning.
    """
    df = _read_csv(path, label="Price")
    df.columns = [c.strip().capitalize() for c in df.columns]
    _require_columns(df, REQUIRED_PRICE_COLUMNS, label="Price data")

    raw_rows = len(df)
    df["Date"] = parse_dates(df["Date"])
    df["Price"] = pd.to_numeric(df["Price"], errors="coerce")
    df = (
        df.dropna(subset=["Date", "Price"])
        .drop_duplicates(subset="Date")
        .sort_values("Date")
        .reset_index(drop=True)
    )

    if df.empty:
        raise DataValidationError(
            "No valid rows remain after cleaning the price data; check the "
            "'Date' and 'Price' columns in the source file."
        )
    if (df["Price"] <= 0).any():
        raise DataValidationError("Price data contains non-positive values.")

    logger.info(
        "Loaded %d price rows (%d dropped) spanning %s to %s.",
        len(df),
        raw_rows - len(df),
        df["Date"].min().date(),
        df["Date"].max().date(),
    )
    return df


def add_log_returns(df: pd.DataFrame) -> pd.DataFrame:
    """Add ``LogPrice`` and ``LogReturn`` columns to a price DataFrame."""
    _require_columns(df, {"Price"}, label="Price frame")
    out = df.copy()
    out["LogPrice"] = np.log(out["Price"])
    out["LogReturn"] = out["LogPrice"].diff()
    return out


def load_events(path: str | Path = RAW_EVENTS_PATH) -> pd.DataFrame:
    """Load the curated key-events dataset with parsed ``event_date``.

    Raises:
        DataFileNotFoundError: if the events CSV is missing.
        DataValidationError: if required columns are absent or any
            ``event_date`` fails to parse.
    """
    events = _read_csv(path, label="Events")
    _require_columns(events, REQUIRED_EVENT_COLUMNS, label="Events data")

    events["event_date"] = pd.to_datetime(events["event_date"], errors="coerce")
    if events["event_date"].isna().any():
        bad = events.loc[events["event_date"].isna(), "event_name"].tolist()
        raise DataValidationError(
            f"Unparseable event_date(s) for event(s): {bad}. "
            "Use ISO format (YYYY-MM-DD)."
        )

    events = events.sort_values("event_date").reset_index(drop=True)
    logger.info("Loaded %d curated key events.", len(events))
    return events


def save_processed(df: pd.DataFrame, path: str | Path = PROCESSED_PRICE_PATH) -> Path:
    """Persist the cleaned price series (with log returns) to ``data/processed``."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    logger.info("Saved %d processed rows to %s.", len(df), path)
    return path


if __name__ == "__main__":
    prices = add_log_returns(load_prices())
    out_path = save_processed(prices)
    print(
        f"Loaded {len(prices):,} rows spanning "
        f"{prices['Date'].min().date()} to {prices['Date'].max().date()}"
    )
    print(f"Saved cleaned data to {out_path}")
