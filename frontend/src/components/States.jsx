export function Skeleton({ className = "", style }) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function ConsoleSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading the analysis">
      <div className="readout">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="readout-item" key={i}>
            <Skeleton className="sk-label" />
            <Skeleton className="sk-value" />
            <Skeleton className="sk-label" />
          </div>
        ))}
      </div>
      <div className="overview">
        <div className="panel chart-panel">
          <Skeleton className="sk-title" />
          <Skeleton className="sk-chart" />
        </div>
        <div className="panel list-panel">
          <Skeleton className="sk-title" />
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton className="sk-row" key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ApiError({ message, onRetry }) {
  return (
    <div className="page">
      <section className="api-error" aria-labelledby="api-error-title">
        <h1 id="api-error-title">The console can’t reach the analysis API</h1>
        <p className="api-error-msg">{message}</p>
        <ol>
          <li>
            Start the API from the project root with <code>python backend/app.py</code>. It listens on port 5000.
          </li>
          <li>
            If the model results are missing, run <code>python scripts/run_change_point.py</code> first.
          </li>
          <li>Keep this page open and try again.</li>
        </ol>
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      </section>
    </div>
  );
}

export function InlineError({ message, onRetry }) {
  return (
    <div className="inline-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="text-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
