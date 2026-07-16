# Brent Oil Price Change Point Analysis

A data science project (10 Academy Week 10) that detects statistically significant
**structural change points** in historical Brent crude oil prices and associates
them with major geopolitical, OPEC, economic, sanctions, and pandemic events.

**Status:** Final submission complete — Tasks 1–3 (foundation, Bayesian modeling, dashboard).

---

## Business Problem

The oil market is highly volatile, making it hard for investors to manage risk,
for policymakers to plan for economic stability, and for energy companies to
forecast costs. Working as data scientists at the consultancy **Birhan Energies**,
our goal is to analyze how big political and economic events affect Brent oil
prices and deliver clear, data-driven insights.

## Objectives

1. Identify key events that significantly impacted Brent oil prices.
2. Quantify how much these events shifted prices using Bayesian change point analysis.
3. Provide clear, data-driven insights (with honest limitations) via a report and dashboard.

---

## Key Results

| Metric | Value |
|--------|-------|
| Bayesian change point (τ) | **2005-02-28** (95% CI: 2004-10-31 → 2005-06-30) |
| Mean price before → after | **$21.48 → $75.78** (+252.8%) |
| P(μ₂ > μ₁) | **1.0** (r̂ ≈ 1.0) |
| Example event impacts (±90d) | Gulf War +100%; COVID crash −58%; Ukraine +31% |

---

## Repository Structure

```
brent-oil-change-point-analysis/
├── backend/                  # Flask API
├── frontend/                 # React + Recharts dashboard
├── data/raw/                 # BrentOilPrices.csv, key_events.csv
├── data/processed/           # Cleaned / derived data
├── notebooks/
│   ├── 01_eda.ipynb
│   └── 02_change_point_model.ipynb
├── reports/
│   ├── final_report.html     # Final blog-style report
│   ├── interim_report.html
│   ├── model_results.json
│   ├── figures/
│   └── screenshots/
├── scripts/                  # runners + report builders
├── src/                      # reusable Python package
├── tests/
├── requirements.txt
└── README.md
```

---

## Installation

Prerequisites: Python 3.10+, Node.js 18+, `git`.

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

### Analysis pipeline

```bash
# Clean data
python -m src.data_loader

# Fit Bayesian change point model + export results/figures
python scripts/run_change_point.py

# Build reports
python scripts/build_report.py          # interim
python scripts/build_final_report.py    # final (blog style)

# Tests
pytest -q
```

### Dashboard

```bash
# Terminal 1 – API
python backend/app.py

# Terminal 2 – UI
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 (Vite proxies `/api` → Flask on port 5000).

### API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Liveness |
| `GET /api/prices` | Historical prices (`start`, `end`, `max_points`) |
| `GET /api/events` | Curated events (`category`) |
| `GET /api/change-points` | Bayesian + ruptures results |
| `GET /api/event-impact` | Before/after event impacts |
| `GET /api/metrics` | Dashboard KPIs |

---

## Deliverables

| Item | Location |
|------|----------|
| Final report (blog/PDF-ready HTML) | [`reports/final_report.html`](reports/final_report.html) |
| Interim report | [`reports/interim_report.html`](reports/interim_report.html) |
| Task 1 workflow & assumptions | [`reports/task1_analysis_workflow.md`](reports/task1_analysis_workflow.md), [`reports/assumptions_and_limitations.md`](reports/assumptions_and_limitations.md) |
| Events dataset | [`data/raw/key_events.csv`](data/raw/key_events.csv) |
| EDA notebook | [`notebooks/01_eda.ipynb`](notebooks/01_eda.ipynb) |
| Change point notebook | [`notebooks/02_change_point_model.ipynb`](notebooks/02_change_point_model.ipynb) |
| Model results JSON | [`reports/model_results.json`](reports/model_results.json) |
| Dashboard screenshots | [`reports/screenshots/`](reports/screenshots/) |
| Flask API | [`backend/`](backend/) |
| React frontend | [`frontend/`](frontend/) |

---

## Modeling notes

- **PyMC model:** discrete uniform prior on τ, two regime means via `pm.math.switch`, Normal likelihood, MCMC sampling.
- **Complementary multi-break:** `ruptures` Binseg (L2) for additional regime dates.
- **Association ≠ causation:** see [`reports/assumptions_and_limitations.md`](reports/assumptions_and_limitations.md).

## License

Licensed under the terms of the [LICENSE](LICENSE) file.
