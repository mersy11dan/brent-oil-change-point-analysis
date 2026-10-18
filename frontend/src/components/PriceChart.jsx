import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { day, month, shortName, toTime, usd, yearOf } from "../format";
import { C, axisTick } from "../theme";

const YEAR = 365.25 * 864e5;

function timeTicks(a, b) {
  const years = (b - a) / YEAR;
  const out = [];
  if (years <= 3.5) {
    const every = years <= 1.5 ? 3 : 6;
    const start = new Date(a);
    let y = start.getUTCFullYear();
    let m = Math.ceil(start.getUTCMonth() / every) * every;
    for (;;) {
      if (m >= 12) {
        y += 1;
        m -= 12;
      }
      const t = Date.UTC(y, m, 1);
      if (t > b) break;
      if (t >= a) out.push(t);
      m += every;
    }
    return { ticks: out, fmt: (t) => month(new Date(t).toISOString().slice(0, 10)) };
  }
  const step = years > 24 ? 5 : years > 12 ? 2 : 1;
  for (let y = Math.ceil((new Date(a).getUTCFullYear() + 1) / step) * step; Date.UTC(y, 0, 1) <= b; y += step) {
    out.push(Date.UTC(y, 0, 1));
  }
  return { ticks: out, fmt: yearOf };
}

function PriceTip({ active, payload, tau }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <div className="tip-date">{day(p.date)}</div>
      <div className="tip-value">{usd(p.price)}</div>
      {tau != null && <div className="tip-note">{p.t <= tau ? "Before the break" : "After the break"}</div>}
    </div>
  );
}

function Flag({ viewBox, value, anchor = "start", top = false, color = C.ink }) {
  if (!viewBox) return null;
  const { x, y } = viewBox;
  const dx = anchor === "end" ? -8 : anchor === "middle" ? 0 : 8;
  return (
    <text className="chart-flag" x={x + dx} y={top ? y - 10 : y + 16} textAnchor={anchor} fill={color}>
      {value}
    </text>
  );
}

export default function PriceChart({ prices, range, rangeError, bayesian, ruptures, events, selected }) {
  const data = useMemo(() => prices.map((p) => ({ t: toTime(p.date), date: p.date, price: p.price })), [prices]);
  const hasData = data.length > 1;
  const lo = hasData ? data[0].t : toTime(range.start);
  const hi = hasData ? data[data.length - 1].t : toTime(range.end);
  const within = (t) => t >= lo && t <= hi;
  const tau = bayesian ? toTime(bayesian.tau_date) : null;

  const segments = useMemo(() => {
    if (!bayesian) return [];
    const out = [];
    if (lo < tau) out.push({ key: "before", x1: lo, x2: Math.min(tau, hi), y: bayesian.mu_before });
    if (hi > tau) out.push({ key: "after", x1: Math.max(tau, lo), x2: hi, y: bayesian.mu_after });
    return out;
  }, [bayesian, tau, lo, hi]);

  const { yMax, yTicks } = useMemo(() => {
    const top = Math.max(10, ...data.map((d) => d.price), ...segments.map((s) => s.y)) * 1.04;
    const step = [5, 10, 20, 25, 50].find((s) => top / s <= 6) || 50;
    const max = Math.ceil(top / step) * step;
    const list = [];
    for (let v = 0; v <= max; v += step) list.push(v);
    return { yMax: max, yTicks: list };
  }, [data, segments]);

  const { ticks, fmt } = useMemo(() => timeTicks(lo, hi), [lo, hi]);
  const hdi = bayesian?.tau_hdi?.map(toTime);
  const showHdi = hdi && hdi[1] >= lo && hdi[0] <= hi;
  const visibleEvents = events.filter((e) => within(toTime(e.event_date)));
  const selT = selected ? toTime(selected.event_date) : null;
  const selAnchor = selT != null && selT - lo > (hi - lo) * 0.78 ? "end" : "start";

  return (
    <section className="panel chart-panel" aria-labelledby="chart-title">
      <div className="panel-head">
        <div>
          <h2 id="chart-title">Daily Brent price</h2>
          <p className="panel-sub">
            {day(range.start)} to {day(range.end)}, USD per barrel
          </p>
        </div>
        <ul className="legend" aria-label="Chart key">
          <li><i className="k-price" />Price</li>
          <li><i className="k-mean" />Mean either side</li>
          <li><i className="k-break" />Bayesian break and 95% interval</li>
          <li><i className="k-rupt" />Ruptures breaks</li>
          <li><i className="k-event" />Events</li>
        </ul>
      </div>

      <div className="chart-box">
        {rangeError ? (
          <div className="empty">
            <p>{rangeError}</p>
            <p>Change one of the dates or pick a preset above.</p>
          </div>
        ) : !hasData ? (
          <div className="empty">
            <p>No trading days between {day(range.start)} and {day(range.end)}.</p>
            <p>Widen the range or pick a preset above.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 26, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[lo, hi]}
                ticks={ticks}
                tickFormatter={fmt}
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: C.faint }}
                minTickGap={24}
              />
              <YAxis
                domain={[0, yMax]}
                ticks={yTicks}
                tickFormatter={(v) => `$${v}`}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<PriceTip tau={tau} />} cursor={{ stroke: C.ink, strokeOpacity: 0.25 }} isAnimationActive={false} />
              {showHdi && (
                <ReferenceArea x1={Math.max(hdi[0], lo)} x2={Math.min(hdi[1], hi)} fill={C.accent} fillOpacity={0.2} strokeOpacity={0} />
              )}
              {visibleEvents.map((e) => (
                <ReferenceLine key={e.event_date} x={toTime(e.event_date)} stroke={C.faint} />
              ))}
              {ruptures.filter((d) => within(toTime(d))).map((d) => (
                <ReferenceLine key={d} x={toTime(d)} stroke={C.ink} strokeDasharray="2 4" strokeOpacity={0.6} />
              ))}
              {segments.map((s) => (
                <ReferenceLine
                  key={s.key}
                  segment={[{ x: s.x1, y: s.y }, { x: s.x2, y: s.y }]}
                  stroke={C.ink}
                  strokeDasharray="7 5"
                  strokeOpacity={0.55}
                  strokeWidth={1.5}
                />
              ))}
              <Line dataKey="price" stroke={C.ink} strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: C.accent, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
              {tau != null && within(tau) && (
                <ReferenceLine
                  x={tau}
                  stroke={C.accent}
                  strokeWidth={2}
                  label={<Flag value={`Break, ${month(bayesian.tau_date)}`} anchor="middle" top />}
                />
              )}
              {selT != null && within(selT) && (
                <ReferenceLine x={selT} stroke={C.ink} strokeWidth={2} label={<Flag value={shortName(selected.event_name)} anchor={selAnchor} />} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
