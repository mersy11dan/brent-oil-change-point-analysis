"""Unit tests for the data loading and cleaning utilities."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from src.data_loader import (
    add_log_returns,
    load_events,
    load_prices,
    parse_dates,
)
from src.exceptions import DataFileNotFoundError, DataValidationError


def test_parse_dates_handles_mixed_formats():
    raw = pd.Series(["20-May-87", "Nov 09, 2022", "01-Jun-87"])
    parsed = parse_dates(raw)
    assert parsed.notna().all()
    assert parsed.iloc[0] == pd.Timestamp("1987-05-20")
    assert parsed.iloc[1] == pd.Timestamp("2022-11-09")


def test_load_prices_is_clean_and_sorted():
    df = load_prices()
    assert list(df.columns) == ["Date", "Price"]
    assert df["Date"].is_monotonic_increasing
    assert df["Date"].is_unique
    assert not df["Price"].isna().any()
    assert (df["Price"] > 0).all()
    assert len(df) > 8000


def test_add_log_returns():
    df = add_log_returns(load_prices())
    assert "LogReturn" in df.columns
    assert "LogPrice" in df.columns
    assert np.isnan(df["LogReturn"].iloc[0])
    assert df["LogReturn"].iloc[1:].notna().all()


def test_load_events_has_minimum_events():
    events = load_events()
    assert len(events) >= 10
    assert {"event_date", "event_name", "category", "description"}.issubset(
        events.columns
    )
    assert events["event_date"].notna().all()


def test_load_events_has_source_provenance():
    events = load_events()
    assert "source" in events.columns
    # Every event must carry a non-empty provenance/source attribution.
    assert events["source"].str.strip().str.len().gt(0).all()


def test_load_prices_missing_file_raises():
    with pytest.raises(DataFileNotFoundError):
        load_prices("does/not/exist.csv")


def test_load_prices_missing_column_raises(tmp_path):
    bad = tmp_path / "bad.csv"
    bad.write_text("Foo,Bar\n1,2\n", encoding="utf-8")
    with pytest.raises(DataValidationError):
        load_prices(bad)


def test_load_events_missing_column_raises(tmp_path):
    bad = tmp_path / "events.csv"
    bad.write_text("event_date,event_name\n2020-01-01,Test\n", encoding="utf-8")
    with pytest.raises(DataValidationError):
        load_events(bad)


def test_load_events_bad_date_raises(tmp_path):
    bad = tmp_path / "events.csv"
    bad.write_text(
        "event_date,event_name,category,description,expected_impact\n"
        "not-a-date,Test,Conflict,desc,up\n",
        encoding="utf-8",
    )
    with pytest.raises(DataValidationError):
        load_events(bad)


def test_add_log_returns_missing_price_raises():
    with pytest.raises(DataValidationError):
        add_log_returns(pd.DataFrame({"Date": pd.to_datetime(["2020-01-01"])}))
