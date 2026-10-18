"""Generate dashboard demonstration figures from the live Flask API.

The committed PNGs in ``reports/screenshots/`` are browser captures of the
analyst console. This script draws matplotlib stand-ins in the console's
palette for when a headless browser is not available. Run with the API up::

    python backend/app.py
    python scripts/capture_dashboard_views.py
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.request import urlopen

import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import pandas as pd

API = "http://127.0.0.1:5000"
OUT = Path(__file__).resolve().parents[1] / "reports" / "screenshots"


def get(path: str):
    with urlopen(f"{API}{path}", timeout=30) as resp:
        return json.loads(resp.read().decode())


def style():
    plt.rcParams.update(
        {
            "figure.facecolor": "#f4f4f2",
            "axes.facecolor": "#ffffff",
            "axes.edgecolor": "#e3e1dc",
            "axes.labelcolor": "#1f2b4d",
            "text.color": "#1f2b4d",
            "xtick.color": "#5f667b",
            "ytick.color": "#5f667b",
            "grid.color": "#e7e6e1",
            "font.size": 10,
        }
    )


def capture_overview():
    metrics = get("/api/metrics")
    prices = get("/api/prices?start=2000-01-01&end=2022-12-31&max_points=800")["data"]
    cps = get("/api/change-points")
    df = pd.DataFrame(prices)
    df["date"] = pd.to_datetime(df["date"])

    fig = plt.figure(figsize=(14, 8))
    gs = fig.add_gridspec(3, 4, height_ratios=[0.7, 2.2, 0.9], hspace=0.45, wspace=0.3)

    fig.suptitle(
        "Birhan Energies · Brent Oil Change Point Dashboard",
        fontsize=16,
        y=0.98,
    )

    kpis = [
        ("Observations", f"{metrics['n_obs']:,}"),
        ("Latest", f"${metrics['latest_price']:.2f}"),
        ("Volatility", f"{metrics['volatility']:.4f}"),
        ("Bayesian τ", metrics["bayesian_tau"]),
        ("Regime shift", f"+{metrics['bayesian_pct_change']}%"),
        ("Key events", str(metrics["n_events"])),
    ]
    for i, (label, value) in enumerate(kpis[:4]):
        ax = fig.add_subplot(gs[0, i])
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.set_facecolor("#ffffff")
        ax.text(
            0.5, 0.62, value, ha="center", va="center", fontsize=14, fontweight="bold"
        )
        ax.text(
            0.5,
            0.22,
            label.upper(),
            ha="center",
            va="center",
            fontsize=8,
            color="#5f667b",
        )

    ax = fig.add_subplot(gs[1, :])
    ax.plot(df["date"], df["price"], color="#1f2b4d", linewidth=1.2)
    tau = pd.Timestamp(cps["bayesian"]["tau_date"])
    ax.axvline(tau, color="#f7941d", linestyle="-", linewidth=2, label="Bayesian τ")
    for d in cps["ruptures"]:
        ax.axvline(pd.Timestamp(d), color="#1f2b4d", linestyle=":", alpha=0.6)
    ax.set_title("Historical Brent Price with Change Points")
    ax.set_ylabel("USD / barrel")
    ax.grid(True, alpha=0.3)
    ax.legend(loc="upper left", facecolor="#ffffff", edgecolor="#e3e1dc")

    ax2 = fig.add_subplot(gs[2, :])
    ax2.set_xticks([])
    ax2.set_yticks([])
    for spine in ax2.spines.values():
        spine.set_visible(False)
    bay = cps["bayesian"]
    text = (
        f"Filters: 2000-01-01 → 2022-12-31  |  Category: All\n"
        f"Bayesian change point {bay['tau_date']}  |  "
        f"Mean before ${bay['mu_before']} → after ${bay['mu_after']}  "
        f"({bay['pct_change']:+.1f}%)  |  P(μ₂>μ₁)={bay['prob_increase']}"
    )
    ax2.text(0.02, 0.5, text, ha="left", va="center", fontsize=11)

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "dashboard_overview.png"
    fig.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


def capture_event_impact():
    impact = get("/api/event-impact")["data"]
    df = pd.DataFrame(impact)
    fig, ax = plt.subplots(figsize=(13, 6))
    colors = ["#1f2b4d" if v >= 0 else "#b42345" for v in df["price_pct_change"]]
    labels = [n[:28] for n in df["event_name"]]
    ax.barh(labels, df["price_pct_change"], color=colors)
    ax.axvline(0, color="#5f667b", linewidth=0.8)
    ax.set_xlabel("% price change (±90-day window)")
    ax.set_title("Dashboard · Event Impact Drill-down")
    ax.invert_yaxis()
    ax.grid(True, axis="x", alpha=0.3)
    path = OUT / "dashboard_event_impact.png"
    fig.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


def capture_event_highlight():
    prices = get("/api/prices?start=2019-01-01&end=2021-12-31&max_points=600")["data"]
    events = get("/api/events")["data"]
    df = pd.DataFrame(prices)
    df["date"] = pd.to_datetime(df["date"])
    covid = next(e for e in events if "COVID" in e["event_name"])

    fig, ax = plt.subplots(figsize=(13, 5.5))
    ax.plot(df["date"], df["price"], color="#1f2b4d", linewidth=1.3, label="Price")
    ax.axvline(
        pd.Timestamp(covid["event_date"]),
        color="#f7941d",
        linewidth=2,
        label=f"Highlighted: {covid['event_name']}",
    )
    ax.set_title("Dashboard · Event Highlight (COVID-19 crash & OPEC+ price war)")
    ax.set_ylabel("USD / barrel")
    ax.grid(True, alpha=0.3)
    ax.legend(facecolor="#ffffff", edgecolor="#e3e1dc")
    # Callout box
    ax.text(
        0.02,
        0.95,
        f"{covid['event_date']}\n{covid['description']}\nExpected: {covid['expected_impact']}",
        transform=ax.transAxes,
        va="top",
        fontsize=9,
        bbox=dict(boxstyle="round", facecolor="#fff4e6", edgecolor="#f7941d"),
    )
    path = OUT / "dashboard_event_highlight.png"
    fig.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


def main():
    style()
    paths = [capture_overview(), capture_event_impact(), capture_event_highlight()]
    for p in paths:
        print(f"Wrote {p}")


if __name__ == "__main__":
    main()
