import { CATEGORIES, DATA_END, DATA_START, PRESETS } from "../theme";

export default function Toolbar({ range, onRange, category, onCategory, counts, rangeError, onReset, isDefault }) {
  return (
    <div className="toolbar" role="region" aria-label="Filters">
      <div className="toolbar-inner">
        <div className="tool-group" role="group" aria-label="Date range presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="seg"
              aria-pressed={range.preset === p.id}
              onClick={() => onRange({ start: p.start, end: p.end, preset: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="tool-dates">
          <label>
            <span>From</span>
            <input
              type="date"
              name="from"
              autoComplete="off"
              value={range.start}
              min={DATA_START}
              max={DATA_END}
              aria-invalid={rangeError ? "true" : undefined}
              aria-describedby={rangeError ? "range-error" : undefined}
              onChange={(e) => onRange({ ...range, start: e.target.value, preset: null })}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              name="to"
              autoComplete="off"
              value={range.end}
              min={DATA_START}
              max={DATA_END}
              aria-invalid={rangeError ? "true" : undefined}
              aria-describedby={rangeError ? "range-error" : undefined}
              onChange={(e) => onRange({ ...range, end: e.target.value, preset: null })}
            />
          </label>
        </div>

        <div className="tool-group chips" role="group" aria-label="Event category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={category === c}
              onClick={() => onCategory(c)}
            >
              {c === "All" ? "All events" : c}
              <span className="chip-count">{counts[c] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="tool-end">
          <button type="button" className="text-button" onClick={onReset} disabled={isDefault}>
            Reset filters
          </button>
        </div>
      </div>
      {rangeError && (
        <p className="range-error" id="range-error" role="alert">
          {rangeError}
        </p>
      )}
    </div>
  );
}
