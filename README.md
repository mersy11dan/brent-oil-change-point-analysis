# Brent Oil Price Change Point Analysis

A data science project that detects statistically significant **structural change
points** in historical Brent crude oil prices and associates them with major
geopolitical, economic, and OPEC-related events.

---

## Business Problem

Brent crude oil is one of the most important benchmarks in the global energy
market. Its price is highly volatile and is influenced by geopolitical conflicts,
OPEC production decisions, economic shocks, sanctions, and shifts in global demand.

Investors, policymakers, and energy companies need to understand **when** the
behaviour of oil prices changes and **why**. Simply looking at the raw price
series is not enough — abrupt or gradual regime shifts (change points) are often
hidden in the noise.

The core problem: *identify the points in time where the statistical properties
of Brent oil prices change, and provide evidence-based context for those changes
so stakeholders can make better risk and investment decisions.*

---

## Objectives

- Build a clean, reproducible, production-ready project foundation.
- Load and prepare historical Brent oil price data.
- Detect change points in the price / log-return series using statistical and
  Bayesian change point methods.
- Quantify the magnitude and direction of each detected regime shift.
- Associate detected change points with real-world events (geopolitical,
  economic, OPEC policy).
- Communicate insights through clear reports and visualisations.

---

## Repository Structure

```
brent-oil-change-point-analysis/
├── .github/
│   └── workflows/        # CI/CD pipeline definitions
├── data/
│   ├── raw/              # Immutable, original source data
│   └── processed/        # Cleaned and transformed data
├── notebooks/            # Exploratory data analysis (Jupyter)
├── reports/              # Generated reports, figures, and write-ups
├── scripts/              # Standalone / CLI scripts (data prep, pipelines)
│   └── __init__.py
├── src/                  # Reusable, importable source code (package)
│   └── __init__.py
├── tests/                # Unit and integration tests
│   └── __init__.py
├── requirements.txt      # Python dependencies
├── README.md
├── .gitignore
└── LICENSE
```

---

## Installation

**Prerequisites:** Python 3.10+ and `git`.

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd brent-oil-change-point-analysis

# 2. Create and activate a virtual environment
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Project Workflow

1. **Data ingestion** — place the raw Brent oil price dataset in `data/raw/`.
2. **Data preparation** — clean and transform data; write outputs to
   `data/processed/`. Reusable logic lives in `src/`, orchestrated by `scripts/`.
3. **Exploratory analysis** — investigate trends, volatility, and stationarity in
   `notebooks/`.
4. **Change point modelling** — apply statistical and Bayesian change point
   detection using code in `src/`.
5. **Event association** — map detected change points to a curated set of
   real-world events.
6. **Reporting** — export figures and findings to `reports/`.
7. **Testing & CI** — validate logic with `pytest`; automate checks via
   `.github/workflows/`.

---

## Future Tasks

- Compile a curated dataset of key geopolitical and OPEC events.
- Implement and compare multiple change point detection algorithms.
- Add a Bayesian change point model (e.g. with PyMC) for uncertainty estimates.
- Build an interactive dashboard to explore change points and events.
- Add CI workflows for linting, testing, and reproducibility checks.
- Expand test coverage across the `src/` package.

---

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.
