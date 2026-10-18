import { useMemo } from "react";
import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { day, distanceFromBreak, month, pct, toTime, usd } from "../format";
import { C, axisTick } from "../theme";

const DAY = 864e5;
const isoShift = (iso, days) => new Date(toTime(iso) + days * DAY).toISOString().slice(0, 10);

function WindowTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <div className="tip-date">{day(p.date)}</div>
      <div className="tip-value">{usd(p.price)}</div>
    </div>
  );
}

function EventWindow({ event, impact, daily }) {
  const start = isoShift(event.event_date, -120);
  const end = isoShift(event.event_date, 120);
  const series = useMemo(
    () => daily.filter((p) => p.date >= start && p.date <= end).map((p) => ({ t: toTime(p.date), date: p.date, price: p.price })),
    [daily, start, end],
  );
  const t0 = toTime(event.event_date);
  const before = t0 - 90 * DAY;
  const after = t0 + 90 * DAY;

  if (series.length < 2) return <p className="panel-sub">No daily prices around this date.</p>;

  const prices = series.map((d) => d.price).concat(impact ? [impact.price_before, impact.price_after] : []);
  const pMin = Math.min(...prices);
  const pMax = Math.max(...prices);
  const step = [1, 2, 5, 10, 20, 25, 50].find((s) => (pMax - pMin) / s <= 4) || 50;
  const lo = Math.max(0, Math.floor(pMin / step) * step);
  const hi = Math.ceil(pMax / step) * step;
  const yTicks = [];
  for (let v = lo; v <= hi; v += step) yTicks.push(v);
  const months = [];
  for (let m = -4; m <= 4; m += 2) months.push(toTime(isoShift(event.event_date, m * 30.44).slice(0, 8) + "01"));

  return (
    <div className="window-chart">
      <div className="window-plot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[series[0].t, series[series.length - 1].t]}
              ticks={months.filter((t) => t >= series[0].t && t <= series[series.length - 1].t)}
              tickFormatter={(t) => month(new Date(t).toISOString().slice(0, 10))}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: C.faint }}
            />
            <YAxis domain={[lo, hi]} ticks={yTicks} tickFormatter={(v) => `$${v}`} tick={axisTick} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<WindowTip />} cursor={{ stroke: C.ink, strokeOpacity: 0.25 }} isAnimationActive={false} />
            <ReferenceArea x1={before} x2={t0} fill={C.ink} fillOpacity={0.05} strokeOpacity={0} />
            <ReferenceArea x1={t0} x2={after} fill={C.accent} fillOpacity={0.12} strokeOpacity={0} />
            {impact && (
              <>
                <ReferenceLine segment={[{ x: before, y: impact.price_before }, { x: t0, y: impact.price_before }]} stroke={C.muted} strokeWidth={2} strokeDasharray="6 4" />
                <ReferenceLine segment={[{ x: t0, y: impact.price_after }, { x: after, y: impact.price_after }]} stroke={C.ink} strokeWidth={2} strokeDasharray="6 4" />
              </>
            )}
            <ReferenceLine x={t0} stroke={C.ink} strokeWidth={2} />
            <Line dataKey="price" stroke={C.ink} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="window-key">
        <span><i className="k-before" />90 days before</span>
        <span><i className="k-after" />90 days after</span>
        <span><i className="k-mean" />Average of each window</span>
      </p>
    </div>
  );
}

export default function EventDetail({ event, impact, daily, tauDate, inRange, onZoom, onClear }) {
  if (!event) {
    return (
      <section className="panel detail-panel is-empty" aria-labelledby="detail-title">
        <h2 id="detail-title">Event detail</h2>
        <p>
          Pick an event from the list. Its 90-day price window, the change in average price and its distance from the
          Bayesian break appear here, and the event is marked on the price chart.
        </p>
      </section>
    );
  }

  const volRatio = impact && impact.vol_before ? impact.vol_after / impact.vol_before : null;

  return (
    <section className="panel detail-panel" aria-labelledby="detail-title" aria-live="polite">
      <div className="detail-head">
        <div>
          <h2 id="detail-title">{event.event_name}</h2>
          <p className="panel-sub">
            {day(event.event_date)}, {event.category}
            {tauDate ? `. ${distanceFromBreak(tauDate, event.event_date)}` : ""}
          </p>
        </div>
        <div className="detail-actions">
          {!inRange && (
            <button type="button" className="button button-small" onClick={() => onZoom(event)}>
              Show it on the chart
            </button>
          )}
          <button type="button" className="text-button" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-copy">
          <p>{event.description}</p>
          <p className="detail-expect">Expected impact: {event.expected_impact}</p>
          {impact ? (
            <dl className="detail-figures">
              <div>
                <dt>Average, 90 days before</dt>
                <dd>{usd(impact.price_before)}</dd>
              </div>
              <div>
                <dt>Average, 90 days after</dt>
                <dd>{usd(impact.price_after)}</dd>
              </div>
              <div className={impact.price_pct_change < 0 ? "down" : "up"}>
                <dt>Change</dt>
                <dd>{pct(impact.price_pct_change)}</dd>
              </div>
              <div>
                <dt>Volatility before and after</dt>
                <dd>
                  {impact.vol_before.toFixed(4)} to {impact.vol_after.toFixed(4)}
                  {volRatio ? <small>{volRatio.toFixed(1)} times</small> : null}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="panel-sub">No impact figures for this event in the model output.</p>
          )}
        </div>
        <figure className="detail-window">
          <figcaption>
            Daily price, {month(isoShift(event.event_date, -120))} to {month(isoShift(event.event_date, 120))}
          </figcaption>
          <EventWindow event={event} impact={impact} daily={daily} />
        </figure>
      </div>
    </section>
  );
}
