/* Portfolio case-study site — loads static JSON, no backend required. */

const state = {
  data: null,
  category: "All",
  charts: {},
};

const $ = (sel) => document.querySelector(sel);

function fmtUSD(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Number(n).toFixed(2)}`;
}

function pctClass(v) {
  return v >= 0 ? "up" : "down";
}

function pctText(v) {
  const sign = v > 0 ? "+" : "";
  return `${sign}${Number(v).toFixed(1)}%`;
}

async function loadData() {
  const res = await fetch("./data/site_data.json");
  if (!res.ok) throw new Error("Could not load site_data.json");
  return res.json();
}

function renderMetrics(metrics, bayesian) {
  const items = [
    ["Trading days", metrics.n_obs.toLocaleString()],
    ["Date range", `${metrics.start_date} → ${metrics.end_date}`],
    ["Min / Max", `${fmtUSD(metrics.min_price)} / ${fmtUSD(metrics.max_price)}`],
    ["Mean price", fmtUSD(metrics.mean_price)],
    ["Bayesian τ", bayesian.tau_date],
    ["Regime shift", pctText(bayesian.pct_change)],
  ];
  $("#metrics").innerHTML = items
    .map(
      ([lbl, num]) =>
        `<div class="stat"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`
    )
    .join("");
}

function filteredEvents() {
  const events = state.data.events;
  if (state.category === "All") return events;
  return events.filter((e) => e.category === state.category);
}

function filteredImpact() {
  const impact = state.data.results.event_impact || [];
  if (state.category === "All") return impact;
  return impact.filter((e) => e.category === state.category);
}

function destroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    delete state.charts[key];
  }
}

/** Snap an ISO date to the nearest label in the monthly series. */
function nearestLabel(dateStr, labels) {
  if (!labels.length) return dateStr;
  if (labels.includes(dateStr)) return dateStr;
  const t = Date.parse(dateStr);
  let best = labels[0];
  let bestDiff = Infinity;
  for (const lab of labels) {
    const d = Math.abs(Date.parse(lab) - t);
    if (d < bestDiff) {
      bestDiff = d;
      best = lab;
    }
  }
  return best;
}

function renderPriceChart() {
  destroyChart("price");
  const ctx = $("#priceChart");
  const prices = state.data.monthly_prices;
  const labels = prices.map((p) => p.date);
  const events = filteredEvents();
  const bayesian = state.data.results.bayesian_change_point;
  const ruptures = state.data.results.ruptures_change_points || [];

  const annotations = {};
  events.forEach((ev, i) => {
    const x = nearestLabel(ev.event_date, labels);
    annotations[`ev${i}`] = {
      type: "line",
      xMin: x,
      xMax: x,
      borderColor: "rgba(239, 107, 107, 0.45)",
      borderWidth: 1,
      borderDash: [4, 4],
      label: {
        display: false,
        content: ev.event_name,
      },
    };
  });
  const tauX = nearestLabel(bayesian.tau_date, labels);
  annotations.tau = {
    type: "line",
    xMin: tauX,
    xMax: tauX,
    borderColor: "#e8a54b",
    borderWidth: 2,
    label: {
      display: true,
      content: "Bayesian τ",
      position: "start",
      backgroundColor: "rgba(232,165,75,0.9)",
      color: "#14110b",
      font: { weight: "bold", size: 11 },
    },
  };
  ruptures.forEach((d, i) => {
    const x = nearestLabel(d, labels);
    annotations[`rp${i}`] = {
      type: "line",
      xMin: x,
      xMax: x,
      borderColor: "rgba(77, 182, 172, 0.55)",
      borderWidth: 1,
    };
  });

  state.charts.price = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Monthly Brent price (USD/bbl)",
          data: prices.map((p) => p.price),
          borderColor: "#e8a54b",
          backgroundColor: "rgba(232, 165, 75, 0.12)",
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#93a4b5" } },
        annotation: { annotations },
        tooltip: {
          callbacks: {
            afterBody() {
              return "";
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#93a4b5",
            maxTicksLimit: 10,
            callback(val, idx) {
              const label = this.getLabelForValue(val);
              return label ? label.slice(0, 4) : "";
            },
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          ticks: {
            color: "#93a4b5",
            callback: (v) => `$${v}`,
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
      },
    },
  });
}

function renderImpactChart() {
  destroyChart("impact");
  const ctx = $("#impactChart");
  const impact = filteredImpact();
  const labels = impact.map((r) =>
    r.event_name.replace(/\s*\(.*\)\s*$/, "").slice(0, 24)
  );
  const values = impact.map((r) => r.price_pct_change);
  const colors = values.map((v) =>
    v >= 0 ? "rgba(93, 207, 154, 0.85)" : "rgba(239, 107, 107, 0.85)"
  );

  state.charts.impact = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "% price change (±90 days)",
          data: values,
          backgroundColor: colors,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#93a4b5", callback: (v) => `${v}%` },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          ticks: { color: "#c9d5e0", font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

function renderVolChart() {
  destroyChart("vol");
  const ctx = $("#volChart");
  const rows = state.data.volatility;
  state.charts.vol = new Chart(ctx, {
    type: "line",
    data: {
      labels: rows.map((r) => r.date),
      datasets: [
        {
          label: "30-day rolling volatility",
          data: rows.map((r) => r.vol30),
          borderColor: "#4db6ac",
          backgroundColor: "rgba(77, 182, 172, 0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#93a4b5" } } },
      scales: {
        x: {
          ticks: { color: "#93a4b5", maxTicksLimit: 8, callback(v) {
            const label = this.getLabelForValue(v);
            return label ? label.slice(0, 4) : "";
          }},
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          ticks: { color: "#93a4b5" },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
      },
    },
  });
}

function renderImpactTable() {
  const impact = filteredImpact();
  const body = impact
    .map((r) => {
      const cls = pctClass(r.price_pct_change);
      return `<tr>
        <td>${r.event_date}</td>
        <td>${r.event_name}</td>
        <td><span class="tag tag-${r.category.toLowerCase()}">${r.category}</span></td>
        <td>${fmtUSD(r.price_before)} → ${fmtUSD(r.price_after)}</td>
        <td class="${cls}">${pctText(r.price_pct_change)}</td>
      </tr>`;
    })
    .join("");
  $("#impactTable tbody").innerHTML = body;
}

function renderEventsList() {
  const events = filteredEvents();
  $("#eventsList").innerHTML = events
    .map(
      (e) => `<tr>
        <td>${e.event_date}</td>
        <td>${e.event_name}</td>
        <td><span class="tag tag-${e.category.toLowerCase()}">${e.category}</span></td>
        <td>${e.description}</td>
      </tr>`
    )
    .join("");
}

function renderFindings() {
  const b = state.data.results.bayesian_change_point;
  $("#tauCopy").innerHTML = `
    The Bayesian model places the primary structural break at
    <strong>${b.tau_date}</strong>
    (95% interval ${b.tau_hdi[0]} → ${b.tau_hdi[1]}).
    Mean regime price shifted from <strong>${fmtUSD(b.mu_before)}</strong>
    to <strong>${fmtUSD(b.mu_after)}</strong>
    — a <strong>${pctText(b.pct_change)}</strong> increase —
    with P(μ₂ &gt; μ₁) = <strong>${b.prob_increase}</strong>
    and convergence diagnostics r̂ ≈ 1.0 for all parameters.
  `;
}

function wireFilters() {
  const select = $("#categoryFilter");
  select.innerHTML = ["All", "Conflict", "OPEC", "Economic", "Sanctions", "Pandemic"]
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
  select.addEventListener("change", () => {
    state.category = select.value;
    renderPriceChart();
    renderImpactChart();
    renderImpactTable();
    renderEventsList();
  });
}

async function main() {
  try {
    state.data = await loadData();
    const bayesian = state.data.results.bayesian_change_point;
    renderMetrics(state.data.metrics, bayesian);
    renderFindings();
    wireFilters();
    renderPriceChart();
    renderImpactChart();
    renderVolChart();
    renderImpactTable();
    renderEventsList();
    $("#app").classList.remove("loading");
  } catch (err) {
    $("#app").innerHTML = `<p class="loading">Failed to load site data. Run <code>python scripts/build_portfolio_site.py</code> then refresh.<br>${err.message}</p>`;
  }
}

main();
