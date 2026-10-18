import { day, month, pct, usd } from "../format";
import { Skeleton } from "./States";

function Item({ label, value, note, tone, loading }) {
  return (
    <div className={`readout-item ${tone || ""}`}>
      <dt>{label}</dt>
      <dd className="readout-value">{loading ? <Skeleton className="sk-value" /> : value}</dd>
      <dd className="readout-note">{note}</dd>
    </div>
  );
}

export default function Readout({ metrics, bayesian, inView, pricesLoading }) {
  return (
    <dl className="readout" aria-label="Headline numbers">
      <Item
        tone="is-break"
        label="Bayesian break"
        value={bayesian ? month(bayesian.tau_date) : "Not run"}
        note={bayesian ? `95% interval ${month(bayesian.tau_hdi?.[0])} to ${month(bayesian.tau_hdi?.[1])}` : "Run the change point script"}
      />
      <Item
        label="Mean either side"
        value={bayesian ? `${usd(bayesian.mu_before)} → ${usd(bayesian.mu_after)}` : "–"}
        note={bayesian ? `${pct(bayesian.pct_change)}, rise probability ${Number(bayesian.prob_increase).toFixed(2)}` : ""}
      />
      <Item
        label="Mean in view"
        value={inView ? usd(inView.mean) : "–"}
        note={inView ? `Low ${usd(inView.lo)}, high ${usd(inView.hi)}` : "No prices in this range"}
        loading={pricesLoading && !inView}
      />
      <Item label="Latest close" value={usd(metrics.latest_price)} note={day(metrics.end_date)} />
      <Item label="Daily volatility" value={metrics.volatility?.toFixed(4)} note="SD of daily log returns" />
      <Item
        label="Trading days"
        value={metrics.n_obs?.toLocaleString("en-US")}
        note={`${day(metrics.start_date)} to ${day(metrics.end_date)}`}
      />
    </dl>
  );
}
