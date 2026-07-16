import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import {
  fetchChangePoints,
  fetchEventImpact,
  fetchEvents,
  fetchMetrics,
  fetchPrices,
} from "./api";

const CATEGORIES = ["All", "Conflict", "OPEC", "Economic", "Sanctions", "Pandemic"];

function formatUSD(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Number(n).toFixed(2)}`;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [prices, setPrices] = useState([]);
  const [events, setEvents] = useState([]);
  const [changePoints, setChangePoints] = useState(null);
  const [impact, setImpact] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [start, setStart] = useState("2000-01-01");
  const [end, setEnd] = useState("2022-12-31");
  const [category, setCategory] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const cat = category === "All" ? undefined : category;
      const [m, p, e, cp, imp] = await Promise.all([
        fetchMetrics(),
        fetchPrices({ start, end, max_points: 1200 }),
        fetchEvents({ category: cat }),
        fetchChangePoints(),
        fetchEventImpact({ category: cat }),
      ]);
      setMetrics(m);
      setPrices(p.data || []);
      setEvents(e.data || []);
      setChangePoints(cp);
      setImpact(imp.data || []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [start, end, category]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(() => {
    return prices.map((row) => ({
      date: row.date,
      price: row.price,
    }));
  }, [prices]);

  const impactChart = useMemo(() => {
    return impact.map((row) => ({
      name: row.event_name.replace(/\s*\(.*\)\s*$/, "").slice(0, 22),
      pct: row.price_pct_change,
    }));
  }, [impact]);

  const bayesian = changePoints?.bayesian;
  const ruptures = changePoints?.ruptures || [];

  if (loading && !metrics) {
    return <div className="loading">Loading dashboard…</div>;
  }

  if (error && !metrics) {
    return (
      <div className="error">
        <p>{error}</p>
        <p>Start the Flask API: <code>python backend/app.py</code></p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="badge">Birhan Energies · Week 10</div>
          <h1>Brent Oil Change Point Dashboard</h1>
          <p>
            Explore how geopolitical, OPEC, and economic events align with
            structural breaks in Brent crude prices — with Bayesian change-point
            results and interactive event highlights.
          </p>
        </div>
      </header>

      <section className="metrics">
        <Metric label="Observations" value={metrics?.n_obs?.toLocaleString()} />
        <Metric label="Latest Price" value={formatUSD(metrics?.latest_price)} />
        <Metric label="Mean Price" value={formatUSD(metrics?.mean_price)} />
        <Metric label="Volatility (σ)" value={metrics?.volatility ?? "—"} />
        <Metric label="Bayesian τ" value={bayesian?.tau_date ?? "—"} />
        <Metric
          label="Regime Shift"
          value={
            bayesian?.pct_change != null
              ? `${bayesian.pct_change > 0 ? "+" : ""}${bayesian.pct_change}%`
              : "—"
          }
        />
      </section>

      <section className="controls">
        <label>
          Start date
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label>
          Event category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={load}>
          Apply filters
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setSelectedEvent(null);
            setStart("1987-05-20");
            setEnd("2022-11-14");
            setCategory("All");
          }}
        >
          Reset
        </button>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>Historical Brent Price</h2>
          <p className="sub">
            Red = Bayesian change point · Purple = ruptures breaks · Orange =
            selected event highlight
          </p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#8fa3b8", fontSize: 11 }}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: "#8fa3b8", fontSize: 11 }}
                  domain={["auto", "auto"]}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "#122033",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  name="Price (USD/bbl)"
                  stroke="#3d8bfd"
                  strokeWidth={1.6}
                  dot={false}
                  isAnimationActive={false}
                />
                {bayesian?.tau_date && (
                  <ReferenceLine
                    x={bayesian.tau_date}
                    stroke="#e85d5d"
                    strokeDasharray="4 4"
                    label={{
                      value: "Bayesian τ",
                      fill: "#e85d5d",
                      fontSize: 11,
                      position: "insideTopLeft",
                    }}
                  />
                )}
                {ruptures.map((d) => (
                  <ReferenceLine
                    key={d}
                    x={d}
                    stroke="#aa78ff"
                    strokeDasharray="2 4"
                    strokeOpacity={0.7}
                  />
                ))}
                {selectedEvent && (
                  <ReferenceLine
                    x={selectedEvent.event_date}
                    stroke="#f0a06a"
                    strokeWidth={2}
                    label={{
                      value: selectedEvent.event_name.slice(0, 28),
                      fill: "#f0a06a",
                      fontSize: 11,
                      position: "insideTopRight",
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h2>Key Events</h2>
          <p className="sub">Click an event to highlight it on the price chart.</p>
          <ul className="event-list">
            {events.map((ev) => (
              <li
                key={`${ev.event_date}-${ev.event_name}`}
                className={
                  selectedEvent?.event_name === ev.event_name ? "active" : ""
                }
                onClick={() => setSelectedEvent(ev)}
              >
                <div className="name">
                  <span className={`tag ${ev.category.toLowerCase()}`}>
                    {ev.category}
                  </span>
                  {ev.event_name}
                </div>
                <div className="meta">
                  {ev.event_date} · {ev.expected_impact}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>Event Impact (±90 days)</h2>
          <p className="sub">
            Average price change in the 90 days after each event vs. the 90 days
            before.
          </p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactChart} margin={{ bottom: 60, left: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={70}
                  tick={{ fill: "#8fa3b8", fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: "#8fa3b8", fontSize: 11 }}
                  unit="%"
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    background: "#122033",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                  }}
                  formatter={(v) => [`${v}%`, "Price change"]}
                />
                <Bar dataKey="pct" name="% price change" fill="#f0a06a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h2>Bayesian Model Summary</h2>
          <p className="sub">Single change-point model on monthly average prices.</p>
          {bayesian ? (
            <div className="table-wrap">
              <table>
                <tbody>
                  <tr>
                    <th>Change point (τ)</th>
                    <td>{bayesian.tau_date}</td>
                  </tr>
                  <tr>
                    <th>95% credible interval</th>
                    <td>
                      {bayesian.tau_hdi?.[0]} → {bayesian.tau_hdi?.[1]}
                    </td>
                  </tr>
                  <tr>
                    <th>Mean before</th>
                    <td>{formatUSD(bayesian.mu_before)}</td>
                  </tr>
                  <tr>
                    <th>Mean after</th>
                    <td>{formatUSD(bayesian.mu_after)}</td>
                  </tr>
                  <tr>
                    <th>Regime shift</th>
                    <td className={bayesian.pct_change >= 0 ? "up" : "down"}>
                      {bayesian.pct_change > 0 ? "+" : ""}
                      {bayesian.pct_change}%
                    </td>
                  </tr>
                  <tr>
                    <th>P(μ₂ &gt; μ₁)</th>
                    <td>{bayesian.prob_increase}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sub">Run the model to populate this panel.</p>
          )}

          {selectedEvent && (
            <div className="insight">
              <h3>Selected event</h3>
              <p>
                <strong>{selectedEvent.event_name}</strong> ({selectedEvent.event_date})
                — {selectedEvent.description}
              </p>
              <p className="meta">Expected impact: {selectedEvent.expected_impact}</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Quantified Event Impacts</h2>
        <p className="sub">
          Drill-down table of before/after average prices and volatility around
          each curated event.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Category</th>
                <th>Price before</th>
                <th>Price after</th>
                <th>% change</th>
                <th>Vol before</th>
                <th>Vol after</th>
              </tr>
            </thead>
            <tbody>
              {impact.map((row) => (
                <tr key={`${row.event_date}-${row.event_name}`}>
                  <td>{row.event_date}</td>
                  <td>{row.event_name}</td>
                  <td>
                    <span className={`tag ${row.category.toLowerCase()}`}>
                      {row.category}
                    </span>
                  </td>
                  <td>{formatUSD(row.price_before)}</td>
                  <td>{formatUSD(row.price_after)}</td>
                  <td className={row.price_pct_change >= 0 ? "up" : "down"}>
                    {row.price_pct_change > 0 ? "+" : ""}
                    {row.price_pct_change}%
                  </td>
                  <td>{row.vol_before}</td>
                  <td>{row.vol_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
