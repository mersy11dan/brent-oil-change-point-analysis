"""Bayesian change point model for Brent oil prices (PyMC).

Implements the single change point model described in Task 2: a discrete uniform
prior over the switch point ``tau`` and two regime parameters selected via
``pm.math.switch``. Supports a mean-only switch (Normal likelihood) and an
optional mean+variance switch to capture volatility regimes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FIGURES_DIR = PROJECT_ROOT / "reports" / "figures"


@dataclass
class ChangePointResult:
    """Container for the fitted change point results."""

    tau_index: int
    tau_date: pd.Timestamp
    tau_hdi: tuple[pd.Timestamp, pd.Timestamp]
    mu_before: float
    mu_after: float
    mu_before_hdi: tuple[float, float]
    mu_after_hdi: tuple[float, float]
    pct_change: float
    prob_increase: float
    summary: pd.DataFrame = field(repr=False)


def build_and_sample(
    series: pd.Series,
    dates: pd.Series,
    switch_variance: bool = False,
    draws: int = 1500,
    tune: int = 1500,
    chains: int = 2,
    target_accept: float = 0.9,
    random_seed: int = 42,
):
    """Build and sample a single change point model.

    Parameters
    ----------
    series : pd.Series
        The 1-D observed values (e.g. price level or log returns).
    dates : pd.Series
        Datetimes aligned with ``series`` (used to translate ``tau`` to a date).
    switch_variance : bool
        If True, the standard deviation also switches at ``tau``.
    """
    import pymc as pm

    y = np.asarray(series, dtype=float)
    n = len(y)
    idx = np.arange(n)

    with pm.Model() as model:
        tau = pm.DiscreteUniform("tau", lower=0, upper=n - 1)

        mu_1 = pm.Normal("mu_1", mu=y.mean(), sigma=y.std() * 2)
        mu_2 = pm.Normal("mu_2", mu=y.mean(), sigma=y.std() * 2)
        mu = pm.math.switch(tau >= idx, mu_1, mu_2)

        if switch_variance:
            sigma_1 = pm.HalfNormal("sigma_1", sigma=y.std() * 2)
            sigma_2 = pm.HalfNormal("sigma_2", sigma=y.std() * 2)
            sigma = pm.math.switch(tau >= idx, sigma_1, sigma_2)
        else:
            sigma = pm.HalfNormal("sigma", sigma=y.std() * 2)

        pm.Normal("obs", mu=mu, sigma=sigma, observed=y)

        trace = pm.sample(
            draws=draws,
            tune=tune,
            chains=chains,
            target_accept=target_accept,
            random_seed=random_seed,
            progressbar=False,
        )

    return model, trace


def summarize_result(trace, dates: pd.Series) -> ChangePointResult:
    """Translate a sampled trace into an interpretable result object."""
    import arviz as az

    dates = pd.Series(pd.to_datetime(dates)).reset_index(drop=True)
    summary = az.summary(trace, var_names=["tau", "mu_1", "mu_2"])

    post = trace.posterior
    tau_samples = post["tau"].values.flatten()
    tau_index = int(np.round(np.median(tau_samples)))
    tau_lo, tau_hi = np.percentile(tau_samples, [2.5, 97.5]).astype(int)

    mu1 = float(post["mu_1"].values.mean())
    mu2 = float(post["mu_2"].values.mean())
    mu1_hdi = tuple(np.percentile(post["mu_1"].values.flatten(), [2.5, 97.5]))
    mu2_hdi = tuple(np.percentile(post["mu_2"].values.flatten(), [2.5, 97.5]))
    pct = (mu2 - mu1) / abs(mu1) * 100 if mu1 != 0 else float("nan")
    prob_inc = float((post["mu_2"].values > post["mu_1"].values).mean())

    return ChangePointResult(
        tau_index=tau_index,
        tau_date=dates.iloc[tau_index],
        tau_hdi=(dates.iloc[tau_lo], dates.iloc[tau_hi]),
        mu_before=mu1,
        mu_after=mu2,
        mu_before_hdi=(float(mu1_hdi[0]), float(mu1_hdi[1])),
        mu_after_hdi=(float(mu2_hdi[0]), float(mu2_hdi[1])),
        pct_change=float(pct),
        prob_increase=prob_inc,
        summary=summary,
    )


def associate_events(
    tau_date: pd.Timestamp, events: pd.DataFrame, window_days: int = 120
) -> pd.DataFrame:
    """Return events within ``window_days`` of the detected change point."""
    ev = events.copy()
    ev["days_from_tau"] = (ev["event_date"] - tau_date).dt.days
    ev["abs_days"] = ev["days_from_tau"].abs()
    return ev.sort_values("abs_days")


def to_monthly(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate the daily price frame to monthly means (month-end dates)."""
    monthly = (
        df.set_index("Date")["Price"].resample("ME").mean().dropna().reset_index()
    )
    return monthly


def _save(fig: plt.Figure, name: str) -> Path:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    path = FIGURES_DIR / name
    fig.savefig(path, bbox_inches="tight", dpi=110)
    plt.close(fig)
    return path


def plot_trace(trace, var_names, name: str = "cp_trace.png") -> Path:
    """Matplotlib trace + marginal plot (arviz-1.2 independent)."""
    post = trace.posterior
    fig, axes = plt.subplots(len(var_names), 2, figsize=(12, 2.4 * len(var_names)))
    if len(var_names) == 1:
        axes = axes.reshape(1, 2)
    for i, v in enumerate(var_names):
        chains = post[v].values  # (chain, draw)
        for c in range(chains.shape[0]):
            axes[i, 0].plot(chains[c], alpha=0.7, linewidth=0.6)
            axes[i, 1].hist(chains[c], bins=40, alpha=0.5)
        axes[i, 0].set_ylabel(v)
        axes[i, 0].set_title(f"{v} - trace")
        axes[i, 1].set_title(f"{v} - marginal")
    fig.tight_layout()
    return _save(fig, name)


def plot_tau_posterior(trace, dates, name: str = "cp_tau_posterior.png") -> Path:
    """Plot the posterior distribution of the change point date."""
    dates = pd.Series(pd.to_datetime(dates)).reset_index(drop=True)
    tau = trace.posterior["tau"].values.flatten().astype(int)
    tau = np.clip(tau, 0, len(dates) - 1)
    tau_dates = dates.iloc[tau]
    fig, ax = plt.subplots(figsize=(12, 4))
    ax.hist(tau_dates, bins=60, color="#c0392b", alpha=0.85)
    ax.set_title("Posterior distribution of the change point (tau)")
    ax.set_xlabel("Date")
    ax.set_ylabel("Posterior frequency")
    return _save(fig, name)


def plot_price_with_changepoints(
    monthly: pd.DataFrame,
    result: "ChangePointResult",
    extra_cp_dates=None,
    name: str = "cp_price_regimes.png",
) -> Path:
    """Plot monthly price with the Bayesian change point and regime means."""
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.plot(monthly["Date"], monthly["Price"], color="#1f4e79", linewidth=1.1,
            label="Monthly avg price")
    ax.axvline(result.tau_date, color="#c0392b", linestyle="--",
               label=f"Change point ({result.tau_date.date()})")
    ax.axvspan(result.tau_hdi[0], result.tau_hdi[1], color="#c0392b", alpha=0.12,
               label="95% credible interval")
    ax.hlines(result.mu_before, monthly["Date"].min(), result.tau_date,
              color="#117a65", linewidth=2, label=f"Mean before (${result.mu_before:.1f})")
    ax.hlines(result.mu_after, result.tau_date, monthly["Date"].max(),
              color="#b9770e", linewidth=2, label=f"Mean after (${result.mu_after:.1f})")
    if extra_cp_dates is not None:
        for i, d in enumerate(extra_cp_dates):
            ax.axvline(d, color="#6c3483", linestyle=":", alpha=0.6,
                       label="ruptures change points" if i == 0 else None)
    ax.set_title("Brent Price with Detected Change Point(s)")
    ax.set_xlabel("Date")
    ax.set_ylabel("Price (USD/barrel)")
    ax.legend(fontsize=8, loc="upper left")
    return _save(fig, name)


def ruptures_change_points(series: pd.Series, n_bkps: int = 5) -> list[int]:
    """Detect multiple change points with ruptures (PELT/Binseg).

    Returns integer indices (excluding the series end) of the detected breaks.
    """
    import ruptures as rpt

    signal = np.asarray(series, dtype=float).reshape(-1, 1)
    algo = rpt.Binseg(model="l2").fit(signal)
    bkps = algo.predict(n_bkps=n_bkps)
    return [b for b in bkps if b < len(series)]


def event_impact_windows(
    df: pd.DataFrame, events: pd.DataFrame, window_days: int = 90
) -> pd.DataFrame:
    """Compute mean price and volatility before/after each event.

    Volatility is the std of daily log returns in the window.
    """
    d = df.set_index("Date").sort_index()
    rows = []
    for _, ev in events.iterrows():
        t = ev["event_date"]
        before = d.loc[t - pd.Timedelta(days=window_days): t]
        after = d.loc[t: t + pd.Timedelta(days=window_days)]
        if before.empty or after.empty:
            continue
        mp_b, mp_a = before["Price"].mean(), after["Price"].mean()
        vol_b = before["LogReturn"].std() if "LogReturn" in before else np.nan
        vol_a = after["LogReturn"].std() if "LogReturn" in after else np.nan
        rows.append(
            {
                "event_date": t.date().isoformat(),
                "event_name": ev["event_name"],
                "category": ev["category"],
                "price_before": round(float(mp_b), 2),
                "price_after": round(float(mp_a), 2),
                "price_pct_change": round((mp_a - mp_b) / mp_b * 100, 1),
                "vol_before": round(float(vol_b), 4),
                "vol_after": round(float(vol_a), 4),
            }
        )
    return pd.DataFrame(rows)
