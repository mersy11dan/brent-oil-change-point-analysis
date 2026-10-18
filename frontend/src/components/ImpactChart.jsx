import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { day, pct, shortName, usd } from "../format";
import { C, axisTick } from "../theme";
import { useMediaQuery } from "../useMediaQuery";

function ImpactTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="tip">
      <div className="tip-date">{day(r.row.event_date)}</div>
      <div className="tip-name">{r.row.event_name}</div>
      <div className="tip-value">{pct(r.pct)}</div>
      <div className="tip-note">
        {usd(r.row.price_before)} before, {usd(r.row.price_after)} after
      </div>
    </div>
  );
}

function EndLabel({ x, y, width, height, value }) {
  const left = Math.min(x, x + width);
  const right = Math.max(x, x + width);
  const neg = value < 0;
  return (
    <text x={neg ? left - 6 : right + 6} y={y + height / 2 + 4} textAnchor={neg ? "end" : "start"} className="bar-value">
      {pct(value)}
    </text>
  );
}

function NameTick({ x, y, payload }) {
  return (
    <text x={x - 4} y={y + 4} textAnchor="end" className="axis-name">
      {payload.value}
    </text>
  );
}

function BarList({ rows, lim, selected, onSelect }) {
  return (
    <ul className="bar-list">
      {rows.map((r) => {
        const isOn = selected?.event_date === r.row.event_date;
        const w = `${(Math.abs(r.pct) / lim) * 50}%`;
        return (
          <li key={r.row.event_date}>
            <button type="button" className="bar-row" aria-pressed={isOn} onClick={() => onSelect(r.row)}>
              <span className="br-name">{r.label}</span>
              <span className={`br-value ${r.pct < 0 ? "down" : ""}`}>{pct(r.pct)}</span>
              <span className="br-track" aria-hidden="true">
                <i className={r.pct < 0 ? "down" : ""} style={{ width: w }} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function ImpactChart({ impact, selected, onSelect }) {
  const [order, setOrder] = useState("date");
  const compact = useMediaQuery("(max-width: 720px)");

  const rows = useMemo(() => {
    const list = impact.map((row) => ({ row, pct: row.price_pct_change, label: shortName(row.event_name) }));
    if (order === "size") list.sort((a, b) => b.pct - a.pct);
    return list;
  }, [impact, order]);

  const maxAbs = Math.max(0, ...rows.map((r) => Math.abs(r.pct)));
  const step = maxAbs > 100 ? 50 : 25;
  const lim = Math.max(step, Math.ceil(maxAbs / step) * step);
  const ticks = [];
  for (let v = -lim; v <= lim; v += step) ticks.push(v);

  return (
    <section className="panel impact-panel" aria-labelledby="impact-title">
      <div className="panel-head">
        <div>
          <h2 id="impact-title">Change in average price, 90 days after against 90 days before</h2>
          <p className="panel-sub">Select a bar to inspect the event</p>
        </div>
        <div className="tool-group" role="group" aria-label="Sort bars">
          <button type="button" className="seg" aria-pressed={order === "date"} onClick={() => setOrder("date")}>
            By date
          </button>
          <button type="button" className="seg" aria-pressed={order === "size"} onClick={() => setOrder("size")}>
            By change
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty">
          <p>No impact figures for this category.</p>
        </div>
      ) : compact ? (
        <BarList rows={rows} lim={lim} selected={selected} onSelect={onSelect} />
      ) : (
        <div className="impact-box" style={{ height: rows.length * 34 + 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }} barCategoryGap={7}>
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" domain={[-lim, lim]} ticks={ticks} tickFormatter={(v) => `${v}%`} tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" width={250} tick={<NameTick />} tickLine={false} axisLine={false} interval={0} />
              <ReferenceLine x={0} stroke={C.ink} strokeOpacity={0.5} />
              <Tooltip content={<ImpactTip />} cursor={{ fill: C.surface }} isAnimationActive={false} />
              <Bar dataKey="pct" isAnimationActive={false} cursor="pointer" onClick={(d) => onSelect((d.payload || d).row)} label={<EndLabel />}>
                {rows.map((r) => (
                  <Cell
                    key={r.row.event_date}
                    fill={selected?.event_date === r.row.event_date ? C.accent : r.pct < 0 ? C.down : C.ink}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
