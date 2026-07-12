# Notebooks

Exploratory and analysis notebooks for the Brent Oil Change Point Analysis project.

| Notebook | Purpose |
|----------|---------|
| `01_eda.ipynb` | Initial exploratory data analysis: price trend, log returns, volatility clustering, and stationarity (ADF) testing. Exports figures to `../reports/figures/`. |

## Conventions

- Notebooks are numbered by execution order (`01_`, `02_`, ...).
- Reusable logic lives in `src/`; notebooks import from there rather than
  duplicating code.
- Run notebooks from the repository root so relative paths resolve correctly.
