"""Build the self-contained interim HTML report.

Generates ``reports/interim_report.html`` with a clean layout, the key-events
table, and all EDA figures embedded as base64 so the file can be opened or
shared without any external dependencies.

Run from the repository root::

    python scripts/build_report.py
"""

from __future__ import annotations

import base64
import sys
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data_loader import add_log_returns, load_events, load_prices  # noqa: E402
from src import eda  # noqa: E402

FIGURES_DIR = PROJECT_ROOT / "reports" / "figures"
OUTPUT_PATH = PROJECT_ROOT / "reports" / "interim_report.html"


def embed_image(name: str) -> str:
    """Return a base64 data URI for a figure in reports/figures."""
    path = FIGURES_DIR / name
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{data}"


def figure_block(name: str, caption: str) -> str:
    return (
        f'<figure><img src="{embed_image(name)}" alt="{caption}"/>'
        f"<figcaption>{caption}</figcaption></figure>"
    )


def events_table(events) -> str:
    rows = []
    for _, ev in events.iterrows():
        rows.append(
            "<tr>"
            f"<td>{ev['event_date'].date()}</td>"
            f"<td>{ev['event_name']}</td>"
            f"<td><span class='tag tag-{ev['category'].lower()}'>{ev['category']}</span></td>"
            f"<td>{ev['description']}</td>"
            f"<td>{ev['expected_impact']}</td>"
            "</tr>"
        )
    return (
        "<table><thead><tr>"
        "<th>Date</th><th>Event</th><th>Category</th>"
        "<th>Description</th><th>Expected impact</th>"
        "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>"
    )


def build_html() -> str:
    prices = add_log_returns(load_prices())
    events = load_events()
    s = eda.summarize(prices)

    # Ensure figures exist / are current.
    eda.plot_price_series(prices, events)
    eda.plot_log_returns(prices)
    eda.plot_rolling_volatility(prices)
    eda.plot_return_distribution(prices)

    adf_p = s["adf_price"]
    adf_r = s["adf_log_return"]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Brent Oil Change Point Analysis - Interim Report</title>
<style>
  :root {{
    --bg: #0f1c2e; --panel: #ffffff; --ink: #1b2733; --muted: #5b6b7b;
    --accent: #1f4e79; --accent2: #c0392b; --line: #e3e8ee; --soft: #f5f8fb;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--ink); background: var(--soft); line-height: 1.6;
  }}
  header.hero {{
    background: linear-gradient(135deg, #0f1c2e 0%, #1f4e79 100%);
    color: #fff; padding: 56px 24px; text-align: center;
  }}
  header.hero h1 {{ margin: 0 0 8px; font-size: 2rem; letter-spacing: .3px; }}
  header.hero p {{ margin: 4px 0; color: #cfe0f0; }}
  .badge {{
    display: inline-block; margin-top: 14px; padding: 6px 14px; border-radius: 999px;
    background: rgba(255,255,255,.14); font-size: .85rem; letter-spacing: .5px;
  }}
  main {{ max-width: 1040px; margin: -28px auto 60px; padding: 0 20px; }}
  section {{
    background: var(--panel); border: 1px solid var(--line); border-radius: 14px;
    padding: 28px 30px; margin: 22px 0; box-shadow: 0 6px 24px rgba(15,28,46,.06);
  }}
  h2 {{
    font-size: 1.35rem; margin: 0 0 16px; color: var(--accent);
    border-bottom: 2px solid var(--line); padding-bottom: 10px;
  }}
  h3 {{ color: var(--ink); margin: 22px 0 6px; font-size: 1.05rem; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }}
  .stat {{
    background: var(--soft); border: 1px solid var(--line); border-radius: 12px;
    padding: 16px; text-align: center;
  }}
  .stat .num {{ font-size: 1.5rem; font-weight: 700; color: var(--accent); }}
  .stat .lbl {{ font-size: .8rem; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }}
  figure {{ margin: 18px 0; }}
  figure img {{ width: 100%; height: auto; border: 1px solid var(--line); border-radius: 10px; }}
  figcaption {{ font-size: .88rem; color: var(--muted); margin-top: 8px; text-align: center; }}
  table {{ width: 100%; border-collapse: collapse; font-size: .92rem; }}
  th, td {{ text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }}
  thead th {{ background: var(--accent); color: #fff; }}
  tbody tr:nth-child(even) {{ background: var(--soft); }}
  .tag {{ padding: 2px 9px; border-radius: 999px; font-size: .74rem; font-weight: 600; color: #fff; white-space: nowrap; }}
  .tag-conflict {{ background: #c0392b; }}
  .tag-opec {{ background: #1f4e79; }}
  .tag-economic {{ background: #b9770e; }}
  .tag-sanctions {{ background: #6c3483; }}
  .tag-pandemic {{ background: #117a65; }}
  .callout {{
    border-left: 4px solid var(--accent2); background: #fdf3f2; padding: 14px 18px;
    border-radius: 8px; margin: 14px 0;
  }}
  ul {{ margin: 8px 0; padding-left: 22px; }}
  footer {{ text-align: center; color: var(--muted); font-size: .85rem; padding: 24px; }}
  code {{ background: var(--soft); padding: 1px 6px; border-radius: 5px; font-size: .9em; }}
</style>
</head>
<body>
<header class="hero">
  <h1>Brent Oil Price Change Point Analysis</h1>
  <p>Interim Report - Task 1 &amp; Initial EDA</p>
  <p>Birhan Energies | Detecting structural breaks and associating causes</p>
  <span class="badge">Generated {date.today().isoformat()}</span>
</header>
<main>

  <section>
    <h2>1. Overview</h2>
    <p>This interim report lays the foundation for analyzing how major political and
    economic events affect Brent crude oil prices. It documents the dataset, the
    planned analysis workflow, a curated set of key market events, and the initial
    exploratory data analysis (EDA) findings that will guide the Bayesian change
    point model in Task 2.</p>
    <div class="grid">
      <div class="stat"><div class="num">{s['n_obs']:,}</div><div class="lbl">Trading days</div></div>
      <div class="stat"><div class="num">${s['min_price']:.2f}</div><div class="lbl">Min price</div></div>
      <div class="stat"><div class="num">${s['max_price']:.2f}</div><div class="lbl">Max price</div></div>
      <div class="stat"><div class="num">${s['mean_price']:.2f}</div><div class="lbl">Mean price</div></div>
      <div class="stat"><div class="num">{len(events)}</div><div class="lbl">Key events</div></div>
    </div>
    <p style="margin-top:14px;color:var(--muted)">Coverage: <b>{s['start_date']}</b> to
    <b>{s['end_date']}</b> (daily Brent price in USD per barrel).</p>
  </section>

  <section>
    <h2>2. Price Series &amp; Key Events</h2>
    <p>The raw price series shows several distinct regimes. Dashed red lines mark the
    curated events; many align visually with abrupt level shifts - candidate
    structural breaks for the change point model.</p>
    {figure_block("price_series.png", "Brent crude oil price (1987-2022) with key events marked")}
  </section>

  <section>
    <h2>3. Log Returns &amp; Volatility</h2>
    <p>To obtain a stationary series we analyze daily log returns,
    <code>log(P_t) - log(P_(t-1))</code>. The returns fluctuate around zero and
    exhibit clear <b>volatility clustering</b>: calm stretches punctuated by bursts
    of high volatility around crisis periods (2008, 2020).</p>
    {figure_block("log_returns.png", "Daily log returns of Brent price")}
    {figure_block("rolling_volatility.png", "30- and 90-day rolling volatility of log returns")}
    {figure_block("return_distribution.png", "Distribution of daily log returns (heavy-tailed)")}
  </section>

  <section>
    <h2>4. Stationarity Testing (ADF)</h2>
    <p>The Augmented Dickey-Fuller test confirms our modeling choice: the raw price
    is non-stationary while log returns are stationary.</p>
    <table>
      <thead><tr><th>Series</th><th>ADF statistic</th><th>p-value</th><th>Stationary (5%)</th></tr></thead>
      <tbody>
        <tr><td>Price</td><td>{adf_p['adf_statistic']:.3f}</td><td>{adf_p['p_value']:.3f}</td>
            <td>{'Yes' if adf_p['stationary_at_5pct'] else 'No'}</td></tr>
        <tr><td>Log returns</td><td>{adf_r['adf_statistic']:.3f}</td>
            <td>{adf_r['p_value']:.2e}</td>
            <td>{'Yes' if adf_r['stationary_at_5pct'] else 'No'}</td></tr>
      </tbody>
    </table>
    <div class="callout"><b>Implication:</b> the change point model will be applied to
    log returns (or to the price mean via an explicit switch point), not to the raw
    non-stationary price level.</div>
  </section>

  <section>
    <h2>5. Curated Key Events ({len(events)})</h2>
    <p>Major geopolitical, OPEC, economic, sanctions, and pandemic events used to
    interpret detected change points.</p>
    {events_table(events)}
  </section>

  <section>
    <h2>6. Planned Workflow</h2>
    <ol>
      <li>Load and clean the price data (robust mixed-format date parsing).</li>
      <li>Compute log price and log returns.</li>
      <li>EDA: trend, volatility clustering, distribution, stationarity (done here).</li>
      <li>Compile and align the key-events dataset (done here).</li>
      <li>Build a Bayesian change point model in PyMC (Task 2).</li>
      <li>Check convergence (r_hat, trace) and the posterior of the switch point.</li>
      <li>Quantify before/after impact and associate breaks with events.</li>
      <li>Communicate via report and an interactive dashboard (Task 3).</li>
    </ol>
    <p>Full details: <code>reports/task1_analysis_workflow.md</code>.</p>
  </section>

  <section>
    <h2>7. Assumptions &amp; Limitations</h2>
    <p>Key assumptions: log returns are approximately stationary; regimes are
    piecewise-constant; event dates are approximate; a Normal likelihood is a
    reasonable starting point.</p>
    <div class="callout"><b>Correlation vs. causation:</b> a change point detected near
    an event date establishes a <i>temporal association</i>, not proof of causation.
    Confounding factors, coincidence, market anticipation, and simultaneous shocks
    (e.g. COVID-19 and the 2020 OPEC+ price war) all limit causal claims. We therefore
    report change points as evidence-supported hypotheses using cautious language.</div>
    <p>Full details: <code>reports/assumptions_and_limitations.md</code>.</p>
  </section>

</main>
<footer>
  Brent Oil Price Change Point Analysis - Interim submission | Birhan Energies
</footer>
</body>
</html>"""


def main() -> None:
    html = build_html()
    OUTPUT_PATH.write_text(html, encoding="utf-8")
    print(f"Wrote report to {OUTPUT_PATH} ({len(html):,} bytes)")


if __name__ == "__main__":
    main()
