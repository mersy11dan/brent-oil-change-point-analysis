# Brent Oil Price Change Point Analysis

A data science project (10 Academy Week 10) that detects statistically significant
**structural change points** in historical Brent crude oil prices and associates
them with major geopolitical, OPEC, economic, sanctions, and pandemic events.

**Status:** Interim submission complete - Task 1 (foundation) + initial EDA.

---

## Business Problem

The oil market is highly volatile, making it hard for investors to manage risk,
for policymakers to plan for economic stability, and for energy companies to
forecast costs. Working as data scientists at the consultancy **Birhan Energies**,
our goal is to analyze how big political and economic events affect Brent oil
prices and deliver clear, data-driven insights.

## Objectives

1. Identify key events that significantly impacted Brent oil prices over the studied period.
2. Quantify how much these events shifted prices using Bayesian change point analysis.
3. Provide clear, data-driven insights (with honest limitations) for investors,
   policymakers, and energy companies.

---

## Repository Structure

```
brent-oil-change-point-analysis/
├── .github/workflows/        # CI (pytest) - unittests.yml
├── .vscode/                  # Editor settings
├── data/
│   ├── raw/                  # BrentOilPrices.csv, key_events.csv
│   └── processed/            # Cleaned series (generated)
├── notebooks/                # 01_eda.ipynb (initial EDA)
├── reports/                  # Workflow doc, assumptions, figures, interim_report.html
│   └── figures/
├── scripts/                  # build_report.py
├── src/                      # data_loader.py, eda.py, exceptions.py, logging_utils.py
├── tests/                    # unit tests (incl. error-handling cases)
├── requirements.txt
├── README.md
├── .gitignore
└── LICENSE
```

---

## Installation

Prerequisites: Python 3.10+ and `git`.

```bash
git clone https://github.com/mersy11dan/brent-oil-change-point-analysis.git
cd brent-oil-change-point-analysis

python -m venv .venv
# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

---

## Usage

```bash
# Clean the raw data and write data/processed/brent_clean.csv
python -m src.data_loader

# Run the initial EDA notebook (regenerates reports/figures/*)
jupyter nbconvert --to notebook --execute --inplace notebooks/01_eda.ipynb

# Build the self-contained interim HTML report
python scripts/build_report.py

# Run the tests
pytest -q
```

Then open `reports/interim_report.html` in any browser (no server needed - all
figures are embedded).

---

## Interim Deliverables (Task 1)

| Deliverable | Location |
|-------------|----------|
| Planned analysis workflow (1-2 pages) | [`reports/task1_analysis_workflow.md`](reports/task1_analysis_workflow.md) |
| Assumptions & limitations (incl. correlation vs. causation) | [`reports/assumptions_and_limitations.md`](reports/assumptions_and_limitations.md) |
| Curated key-events dataset (15 events, with source provenance) | [`data/raw/key_events.csv`](data/raw/key_events.csv) |
| Initial EDA (notebook + figures) | [`notebooks/01_eda.ipynb`](notebooks/01_eda.ipynb) |
| Consolidated interim report (HTML) | [`reports/interim_report.html`](reports/interim_report.html) |

### Initial EDA findings

- Dataset: 9,011 trading days, 1987-05-20 to 2022-11-14 (min $9.10, max $143.95, mean $48.42).
- The raw price series is **non-stationary** (ADF p = 0.29); daily **log returns are
  stationary** (ADF p ~ 2.5e-29), so change points will be modeled on log returns.
- Log returns show clear **volatility clustering** and a heavy-tailed distribution.
- Several curated events visually align with abrupt regime shifts (2008, 2014-16, 2020, 2022).

---

## Code Quality & Engineering Practices

The codebase is structured for reproducibility, readability, and testability:

- **Modularity.** Logic is separated by concern: data loading/cleaning
  (`src/data_loader.py`), analysis helpers (`src/eda.py`), typed errors
  (`src/exceptions.py`), and logging config (`src/logging_utils.py`). Notebooks
  and the report builder import these modules rather than duplicating logic.
- **Error handling.** Loaders validate their inputs and raise typed exceptions
  (`DataFileNotFoundError`, `DataValidationError`) with actionable messages -
  missing files, missing columns, empty files, unparseable dates, and empty
  results after cleaning are all caught explicitly instead of failing obscurely.
- **Logging.** A shared `get_logger` helper gives every module consistent,
  configurable logging instead of scattered `print` calls.
- **Testing & CI.** `pytest` unit tests cover both the happy path and the
  failure modes (see `tests/`), and run automatically on every push via GitHub
  Actions (`.github/workflows/unittests.yml`).
- **Formatting & tooling.** `black` + `isort` (configured in `pyproject.toml`)
  enforce a consistent style; a `Makefile` exposes `make data|eda|report|test|lint|format`.
- **Type hints & docstrings** throughout the `src/` package.

```bash
make lint    # black --check + isort --check-only
make test    # run the full test suite
```

## Roadmap

- **Task 2:** Bayesian change point model in PyMC (switch point `tau`, before/after
  means, MCMC, convergence checks, quantified impact, event association).
- **Task 3:** Flask API + React dashboard to explore change points and events.

## License

Licensed under the terms of the [LICENSE](LICENSE) file.
