# Notebooks

Exploratory and analysis notebooks for the Brent Oil Change Point Analysis project.

| Notebook | Purpose |
|----------|---------|
| `01_eda.ipynb` | Initial EDA: price trend, log returns, volatility clustering, ADF stationarity. |
| `02_change_point_model.ipynb` | Bayesian change point model (PyMC), ruptures multi-breaks, event association, impact quantification. |

## Conventions

- Notebooks are numbered by execution order (`01_`, `02_`, ...).
- Reusable logic lives in `src/`; notebooks import from there rather than
  duplicating code.
- Run notebooks from the repository root so relative paths resolve correctly.
