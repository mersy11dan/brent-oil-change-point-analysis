# Scripts

Standalone, runnable scripts that orchestrate the reusable logic in `src/`.

| Script | Purpose |
|--------|---------|
| `run_change_point.py` | Fit the PyMC change point model; write figures + `reports/model_results.json`. |
| `build_report.py` | Self-contained interim HTML report. |
| `build_final_report.py` | Final blog-style HTML report with methodology, impacts, dashboard views. |
| `build_portfolio_site.py` | Build the static portfolio website into `docs/` (data + assets). |
| `capture_dashboard_views.py` | Generate dashboard demonstration PNGs from the live API. |

## Usage

Run scripts from the repository root, e.g.:

```bash
python scripts/run_change_point.py
python scripts/build_final_report.py
python scripts/build_portfolio_site.py
```
