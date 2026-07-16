"""Build the self-contained final HTML report (blog / Medium style).

Run from the repository root::

    python scripts/build_final_report.py
"""

from __future__ import annotations

import base64
import json
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FIGURES = PROJECT_ROOT / "reports" / "figures"
SHOTS = PROJECT_ROOT / "reports" / "screenshots"
RESULTS = PROJECT_ROOT / "reports" / "model_results.json"
OUTPUT = PROJECT_ROOT / "reports" / "final_report.html"


def embed(path: Path) -> str:
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    suffix = path.suffix.lower().lstrip(".")
    mime = "png" if suffix == "png" else suffix
    return f"data:image/{mime};base64,{data}"


def fig(path: Path, caption: str) -> str:
    if not path.exists():
        return f"<p><em>Missing figure: {path.name}</em></p>"
    return (
        f'<figure><img src="{embed(path)}" alt="{caption}"/>'
        f"<figcaption>{caption}</figcaption></figure>"
    )


def impact_rows(impact: list[dict]) -> str:
    rows = []
    for r in impact:
        cls = "up" if r["price_pct_change"] >= 0 else "down"
        sign = "+" if r["price_pct_change"] > 0 else ""
        rows.append(
            "<tr>"
            f"<td>{r['event_date']}</td>"
            f"<td>{r['event_name']}</td>"
            f"<td>{r['category']}</td>"
            f"<td>${r['price_before']:.2f}</td>"
            f"<td>${r['price_after']:.2f}</td>"
            f"<td class='{cls}'>{sign}{r['price_pct_change']}%</td>"
            f"<td>{r['vol_before']}</td>"
            f"<td>{r['vol_after']}</td>"
            "</tr>"
        )
    return "".join(rows)


def main() -> None:
    results = json.loads(RESULTS.read_text(encoding="utf-8"))
    bay = results["bayesian_change_point"]
    impact = results["event_impact"]
    ruptures = results["ruptures_change_points"]
    nearest = results.get("nearest_events", [])

    nearest_html = "".join(
        f"<li><strong>{e['event_name']}</strong> ({e['event_date']}) — "
        f"{e['days_from_tau']} days from τ</li>"
        for e in nearest[:5]
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>How Events Reshape Brent Oil Prices — Final Report</title>
<style>
  :root {{
    --ink:#1a2330; --muted:#5b6b7b; --accent:#1f4e79; --soft:#f4f7fb;
    --line:#e2e8f0; --up:#117a65; --down:#c0392b; --bg:#fff;
  }}
  * {{ box-sizing:border-box; }}
  body {{
    margin:0; font-family: Georgia, "Times New Roman", serif;
    color:var(--ink); background:var(--soft); line-height:1.7;
  }}
  .wrap {{ max-width:780px; margin:0 auto; padding:40px 20px 80px; }}
  header {{
    background:linear-gradient(135deg,#0f1c2e,#1f4e79); color:#fff;
    padding:56px 24px; text-align:center;
  }}
  header h1 {{
    font-size:clamp(1.8rem,4vw,2.6rem); margin:0 0 12px; font-weight:600;
    letter-spacing:-0.3px;
  }}
  header p {{ margin:4px 0; color:#cfe0f0; font-family:-apple-system,Segoe UI,sans-serif; }}
  .badge {{
    display:inline-block; margin-top:16px; padding:6px 14px; border-radius:999px;
    background:rgba(255,255,255,.14); font-size:.85rem;
    font-family:-apple-system,Segoe UI,sans-serif;
  }}
  article {{
    background:var(--bg); border:1px solid var(--line); border-radius:16px;
    padding:36px 40px; margin-top:-28px; box-shadow:0 10px 40px rgba(15,28,46,.08);
  }}
  h2 {{
    font-size:1.45rem; color:var(--accent); margin:36px 0 12px;
    border-bottom:2px solid var(--line); padding-bottom:8px;
  }}
  h3 {{ font-size:1.1rem; margin:24px 0 8px; }}
  p, li {{ font-size:1.05rem; }}
  .lede {{ font-size:1.2rem; color:var(--muted); }}
  figure {{ margin:24px 0; }}
  figure img {{ width:100%; border-radius:10px; border:1px solid var(--line); }}
  figcaption {{
    font-family:-apple-system,Segoe UI,sans-serif; font-size:.88rem;
    color:var(--muted); text-align:center; margin-top:8px;
  }}
  .callout {{
    border-left:4px solid var(--accent); background:#eef4fa; padding:14px 18px;
    border-radius:8px; margin:18px 0;
    font-family:-apple-system,Segoe UI,sans-serif;
  }}
  table {{
    width:100%; border-collapse:collapse; font-size:.9rem;
    font-family:-apple-system,Segoe UI,sans-serif; margin:16px 0;
  }}
  th, td {{ text-align:left; padding:9px 8px; border-bottom:1px solid var(--line); }}
  thead th {{ background:var(--accent); color:#fff; }}
  .up {{ color:var(--up); font-weight:700; }}
  .down {{ color:var(--down); font-weight:700; }}
  code {{
    background:var(--soft); padding:1px 6px; border-radius:4px;
    font-family:ui-monospace,Consolas,monospace; font-size:.9em;
  }}
  footer {{
    text-align:center; color:var(--muted); font-size:.85rem; padding:28px;
    font-family:-apple-system,Segoe UI,sans-serif;
  }}
  @media (max-width:640px) {{
    article {{ padding:24px 18px; }}
  }}
</style>
</head>
<body>
<header>
  <h1>How Political and Economic Events Reshape Brent Oil Prices</h1>
  <p>A Bayesian change point analysis for Birhan Energies</p>
  <p>10 Academy · Week 10 · Final Report</p>
  <span class="badge">Generated {date.today().isoformat()}</span>
</header>
<div class="wrap">
<article>

<p class="lede">
Oil markets move in regimes. Using daily Brent prices from 1987 to 2022, we detect
structural breaks with a Bayesian change point model, associate them with major
geopolitical and OPEC events, and quantify the before/after impact for investors,
policymakers, and energy companies.
</p>

<h2>1. Business problem</h2>
<p>
At Birhan Energies we are asked a practical question: <em>when</em> does the
behaviour of Brent prices change, and <em>which</em> events are consistent with
those shifts? Investors need risk context; policymakers need energy-security
insight; operators need planning signals. A single continuous price series hides
regime changes — change point analysis makes them explicit.
</p>

<h2>2. Data and methods</h2>
<p>
We analyse <strong>{results['data']['n_daily']:,}</strong> daily Brent prices
({results['data']['start_date']} to {results['data']['end_date']}), plus a curated
set of 15 events spanning conflict, OPEC policy, sanctions, pandemics, and
economic shocks.
</p>
<p>
Exploratory analysis showed the raw price is non-stationary while daily log
returns are stationary and exhibit volatility clustering. For the Bayesian model
we aggregate to monthly average prices (<strong>{results['data']['n_monthly']}</strong>
points) so the discrete switch-point prior is computationally and interpretively
tractable.
</p>

<h3>Bayesian single change point model (PyMC)</h3>
<pre style="background:#0f1c2e;color:#dfe9f5;padding:16px;border-radius:10px;overflow:auto;font-size:.9rem;">
tau   ~ DiscreteUniform(0, N-1)
mu_1  ~ Normal(mean, 2·std)     # before τ
mu_2  ~ Normal(mean, 2·std)     # after τ
sigma ~ HalfNormal(2·std)
mu_t  = switch(τ ≥ t, μ₁, μ₂)
price ~ Normal(mu_t, sigma)
</pre>
<p>
We sample with MCMC (<code>pm.sample</code>), check convergence with
<code>r_hat ≈ 1.0</code>, and report the posterior of τ and the regime means.
As a complementary multi-break detector we also run <code>ruptures</code>
(Binseg, L2).
</p>

{fig(FIGURES / "cp_trace.png", "MCMC trace and marginal posteriors for τ, μ₁, μ₂, σ")}
{fig(FIGURES / "cp_tau_posterior.png", "Posterior distribution of the change point date τ")}

<h2>3. Key finding: a dominant regime shift in early 2005</h2>
<div class="callout">
<strong>Detected change point:</strong> {bay['tau_date']}<br/>
<strong>95% credible interval:</strong> {bay['tau_hdi'][0]} → {bay['tau_hdi'][1]}<br/>
<strong>Mean before:</strong> ${bay['mu_before']:.2f}/bbl &nbsp;|&nbsp;
<strong>Mean after:</strong> ${bay['mu_after']:.2f}/bbl<br/>
<strong>Regime shift:</strong> <span class="up">{bay['pct_change']:+.1f}%</span>
&nbsp;|&nbsp; <strong>P(μ₂ &gt; μ₁)</strong> = {bay['prob_increase']}
</div>
<p>
The model identifies a sharp, high-confidence break in early 2005. The average
monthly Brent price jumps from roughly <strong>${bay['mu_before']:.0f}</strong> to
<strong>${bay['mu_after']:.0f}</strong> per barrel. This is consistent with the
mid-2000s demand super-cycle — rapid emerging-market growth and tight spare
capacity — that paved the way for the 2008 spike. Nearest curated events to τ:
</p>
<ul>{nearest_html}</ul>

{fig(FIGURES / "cp_price_regimes.png", "Monthly Brent price with Bayesian change point, credible interval, and ruptures breaks")}

<p>
Additional ruptures breaks fall near {", ".join(ruptures)} — aligning with the
late-1990s recovery, Arab Spring (2011), the 2014 OPEC non-cut, and the
post-COVID rebound.
</p>

<h2>4. Quantified event impacts (±90 days)</h2>
<p>
For each curated event we compare average price and volatility in the 90 days
before vs. after the event date. These are <em>associations in time</em>, not
causal proofs.
</p>
<table>
<thead>
<tr>
<th>Date</th><th>Event</th><th>Category</th>
<th>Before</th><th>After</th><th>% Δ</th>
<th>Vol before</th><th>Vol after</th>
</tr>
</thead>
<tbody>
{impact_rows(impact)}
</tbody>
</table>

<h3>Highlighted impact statements</h3>
<ul>
<li>Following Iraq’s invasion of Kuwait (1990-08-02), average price rose from
<strong>$16.37</strong> to <strong>$32.79</strong> (+100.3%), with volatility roughly doubling.</li>
<li>Around the Lehman collapse (2008-09-15), average price fell from
<strong>$121.14</strong> to <strong>$65.74</strong> (−45.7%).</li>
<li>After OPEC declined to cut output (2014-11-27), prices dropped from
<strong>$88.70</strong> to <strong>$56.35</strong> (−36.5%).</li>
<li>During the COVID-19 crash &amp; OPEC+ price war (2020-03-08), prices collapsed
from <strong>$61.43</strong> to <strong>$25.88</strong> (−57.9%), with volatility
spiking to <strong>0.141</strong>.</li>
<li>Following Russia’s invasion of Ukraine (2022-02-24), average price rose from
<strong>$84.63</strong> to <strong>$110.92</strong> (+31.1%).</li>
</ul>

<h2>5. Interactive dashboard</h2>
<p>
We built a Flask API and React (Recharts) dashboard so stakeholders can filter by
date range and event category, highlight individual events on the price chart,
and drill into quantified impacts.
</p>
{fig(SHOTS / "dashboard_overview.png", "Dashboard overview: KPIs, filters, and price chart with change points")}
{fig(SHOTS / "dashboard_event_highlight.png", "Event highlight: COVID-19 crash & OPEC+ price war")}
{fig(SHOTS / "dashboard_event_impact.png", "Event impact bar chart (±90-day price change)")}

<p>
<strong>Run locally:</strong>
<code>python backend/app.py</code> and
<code>cd frontend &amp;&amp; npm install &amp;&amp; npm run dev</code>
→ open http://127.0.0.1:5173
</p>

<h2>6. Limitations and future work</h2>
<p>
A change point near an event establishes <strong>temporal association</strong>, not
causation. Confounding, anticipation, and simultaneous shocks (e.g. COVID demand
collapse plus the 2020 OPEC+ price war) all limit causal claims. A single
change-point model recovers the dominant break; real markets have many.
</p>
<ul>
<li>Extend to multiple Bayesian change points and/or variance switches.</li>
<li>Use a Student-t likelihood for heavy-tailed returns.</li>
<li>Add macro covariates (GDP, FX, inventories) in a regression / VAR framework.</li>
<li>Compare with Markov-switching models for calm vs. volatile regimes.</li>
</ul>

<h2>7. Conclusion</h2>
<p>
Brent oil prices are best understood as a sequence of regimes punctuated by
identifiable breaks. Our Bayesian analysis finds a dominant shift in early 2005
(+{bay['pct_change']:.0f}% mean price), while event-window analysis quantifies
large moves around wars, OPEC decisions, and crises. Together with the interactive
dashboard, these results give Birhan Energies’ clients a clear, probabilistic
lens on how the oil market responds to the world around it.
</p>

</article>
</div>
<footer>
  Birhan Energies · Brent Oil Change Point Analysis · Final submission<br/>
  Code: GitHub main branch · Full methodology in notebooks/ and reports/
</footer>
</body>
</html>"""

    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT} ({len(html):,} bytes)")


if __name__ == "__main__":
    main()
