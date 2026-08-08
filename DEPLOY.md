# Deploy the portfolio website

The live site is the static folder [`docs/`](docs/). No Flask or Node is required.

## One-time GitHub setup (do this now)

1. Open: https://github.com/mersy11dan/brent-oil-change-point-analysis/settings/pages
2. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/docs`
3. Click **Save**
4. Wait about 1 minute
5. Visit:

**https://mersy11dan.github.io/brent-oil-change-point-analysis/**

If the page 404s, wait another minute and hard-refresh (Ctrl+F5).

## Rebuild site files locally (optional)

```bash
python scripts/build_portfolio_site.py
git add docs
git commit -m "chore: rebuild portfolio site"
git push origin main
```

## Local preview

```bash
python -m http.server 8080 --directory docs
```

Open http://127.0.0.1:8080
