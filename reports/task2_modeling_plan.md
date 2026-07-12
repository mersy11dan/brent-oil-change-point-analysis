# Task 2 - Bayesian Change Point Modeling Plan

This document plans the Bayesian change point model to be implemented in Task 2,
building on the Task 1 foundation and initial EDA.

## Modeling target

The EDA showed the raw price is non-stationary while daily log returns are
stationary. We will therefore model a switch in the **mean daily log return** (and,
as an extension, a switch in volatility), using an explicit switch point.

## Single change point model (baseline)

```
tau   ~ DiscreteUniform(0, N-1)          # switch point (day index)
mu_1  ~ Normal(0, sigma_mu)              # mean before tau
mu_2  ~ Normal(0, sigma_mu)              # mean after tau
sigma ~ HalfNormal(sigma_prior)          # observation noise
mu_t  = switch(t < tau, mu_1, mu_2)      # pm.math.switch
y_t   ~ Normal(mu_t, sigma)              # likelihood on log returns
```

- `tau` is a discrete uniform prior over all candidate days.
- `pm.math.switch(tau >= t, mu_1, mu_2)` selects the active mean per time index.
- Sampling via `pm.sample()` (NUTS for continuous params; `tau` marginalized or
  sampled with a compatible step).

## Diagnostics

- Convergence: `az.summary()` / `pm.summary()` with `r_hat` close to 1.0.
- Trace plots: `az.plot_trace()`.
- Change point certainty: posterior distribution of `tau` (a sharp, narrow peak
  indicates high certainty about the break date).

## Impact quantification

- Plot posterior distributions of `mu_1`, `mu_2`, and `mu_2 - mu_1`.
- Report credible intervals and probabilistic statements, e.g.
  "P(mu_2 > mu_1) = ...".
- Translate the shift back to price terms where meaningful and associate the
  detected `tau` date with the curated events in `data/raw/key_events.csv`.

## Extensions (future work)

- **Change in variance**: add a switch on `sigma` to capture volatility regimes.
- **Multiple change points**: several switch points or a hierarchical / spike-and-slab formulation.
- **Alternative likelihood**: Student-t to accommodate heavy tails observed in the EDA.
- **Explanatory factors**: incorporate macro variables (GDP, inflation, FX) via regression.
- **Other models**: VAR for dynamic relationships; Markov-switching for calm vs. volatile regimes.
