import { distanceFromBreak, month, usd } from "../format";

const PARAMS = {
  tau: "Break month",
  mu_1: "Mean before",
  mu_2: "Mean after",
  sigma: "Sigma",
};

export default function ModelPanel({ changePoints, modelError }) {
  if (!changePoints) {
    return (
      <section className="panel model-panel is-empty" aria-labelledby="model-title">
        <h2 id="model-title">Model output</h2>
        <p>{modelError || "No model results yet."}</p>
        <p>
          Run <code>python scripts/run_change_point.py</code> to write <code>reports/model_results.json</code>, then reload.
        </p>
      </section>
    );
  }

  const b = changePoints.bayesian;
  const summary = changePoints.convergence_summary || [];
  const ruptures = changePoints.ruptures || [];

  const cell = (row, key) => {
    if (row.index === "tau") {
      if (key === "mean") return month(b.tau_date);
      if (key === "sd") return `${row.sd} months`;
    }
    if (key === "mean" || key === "sd") return usd(row[key]);
    return row[key];
  };

  return (
    <section className="panel model-panel" aria-labelledby="model-title">
      <div className="panel-head">
        <div>
          <h2 id="model-title">Model output</h2>
          <p className="panel-sub">One change point in the monthly average, PyMC with a uniform prior over 427 months</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table compact">
          <caption className="sr-only">Posterior summary</caption>
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              <th scope="col" className="num">Mean</th>
              <th scope="col" className="num">SD</th>
              <th scope="col" className="num col-ess">ESS</th>
              <th scope="col" className="num">R-hat</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.index} className={row.index === "tau" ? "is-break" : ""}>
                <th scope="row">{PARAMS[row.index] || row.index}</th>
                <td className="num">{cell(row, "mean")}</td>
                <td className="num">{cell(row, "sd")}</td>
                <td className="num col-ess">{Number(row.ess_bulk).toLocaleString("en-US")}</td>
                <td className="num">{row.r_hat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="model-facts">
        <div>
          <dt>95% interval for the break</dt>
          <dd>
            {month(b.tau_hdi?.[0])} to {month(b.tau_hdi?.[1])}
          </dd>
        </div>
        <div>
          <dt>Probability the mean rose</dt>
          <dd>{Number(b.prob_increase).toFixed(2)}</dd>
        </div>
      </dl>

      <h3 className="model-sub">Ruptures breaks, found independently</h3>
      <ol className="rupture-list">
        {ruptures.map((d) => (
          <li key={d}>
            <span className="rl-date">{month(d)}</span>
            <span className="rl-gap">{distanceFromBreak(b.tau_date, d)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
