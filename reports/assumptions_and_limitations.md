# Assumptions and Limitations

This document records the assumptions underpinning the Brent oil change point
analysis and its limitations, with an explicit discussion of the difference
between statistical correlation in time and proven causal impact.

---

## 1. Assumptions

1. **Data quality:** The provided daily prices are accurate. Non-trading days are
   simply absent; we do not resample to a fixed calendar for the baseline analysis.
2. **Continuity of the benchmark:** "Brent price" refers to a consistent benchmark
   throughout 1987-2022, so prices are comparable across the whole span.
3. **Log returns approximate a stable process:** Daily log returns are
   (weakly) stationary - supported by the ADF test (p ~ 2.5e-29) - so they are a
   valid target for detecting shifts in mean/variance.
4. **Piecewise-constant regimes:** For a single change point model, we assume the
   parameter of interest (e.g. mean) is approximately constant within each segment
   and changes at discrete switch points.
5. **Normal likelihood as a starting point:** Returns are modeled as approximately
   Normal within a regime, acknowledging real returns have heavier tails.
6. **Event dates are approximate:** Curated events have approximate start dates;
   markets may anticipate or lag the "official" date.
7. **Exogeneity of events (working assumption):** Listed events are treated as
   external shocks to the oil market for interpretation, while acknowledging
   feedback effects exist.

---

## 2. Limitations

1. **Single vs. multiple change points:** A basic model finds one break; the true
   series contains many. Multi-change-point or online methods are future work.
2. **Model dependence:** Results depend on priors, likelihood choice, and whether
   we model the price mean or the return series.
3. **Confounding:** Multiple events often cluster in time (e.g. 2020 COVID +
   OPEC+ price war), making it hard to attribute a break to a single cause.
4. **Latent drivers:** Prices are influenced by unobserved factors (inventories,
   speculation, the US dollar, macro conditions) not in the model.
5. **Data granularity:** Daily closing prices miss intraday dynamics and are not
   volume-weighted.
6. **Detection lag/uncertainty:** The posterior of the change point has width;
   sharp, narrow peaks indicate confidence, broad ones indicate uncertainty.

---

## 3. Correlation in Time vs. Causal Impact

A central caution for this project: **detecting a change point near an event date
establishes temporal association (correlation), not causation.**

- **What the model shows:** The model can tell us that the statistical behavior of
  prices changed around a particular date, and that this date is close to a known
  event. That is a correlation in time.
- **What it does not show:** It does not prove that the event *caused* the change.
  Other things may explain it:
  - **Confounding:** A third factor may drive both the event and the price change
    (e.g. a global recession affecting demand and prompting policy responses).
  - **Coincidence:** With decades of daily data and many candidate events, some
    change points will align with events by chance.
  - **Reverse influence / anticipation:** Markets often move *before* an
    announcement as expectations form, so timing alignment can be misleading.
  - **Simultaneous events:** Overlapping shocks (e.g. pandemic demand collapse and
    an OPEC+ price war in March 2020) make single-cause attribution unreliable.

**Establishing causation** would require stronger evidence - controlled or natural
experiments, instrumental variables, counterfactual/structural modeling, or
explicit control for confounders (macro variables, inventories, exchange rates).
Such approaches are noted as future work.

**Practical stance:** We report detected change points and their proximity to
events as *evidence-supported hypotheses* about likely drivers, using cautious
language ("consistent with", "coincides with", "likely associated with") rather
than causal claims, and we always pair a detected break with its uncertainty.
