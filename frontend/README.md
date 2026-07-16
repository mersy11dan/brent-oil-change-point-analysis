# Frontend (React Dashboard)

Interactive dashboard for exploring Brent oil prices, change points, and event
impacts. Built with Vite, React 18, and Recharts.

## Features

- KPI cards (latest price, volatility, Bayesian τ, regime shift)
- Date-range and event-category filters
- Price chart with Bayesian change point, ruptures breaks, and event highlight
- Clickable event list for drill-down
- Bar chart of ±90-day event price impacts
- Quantified impact table

## Setup

```bash
# Terminal 1 – API (from repo root)
python backend/app.py

# Terminal 2 – UI
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to the Flask server on port 5000.
