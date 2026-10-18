import { PAGES_URL } from "../theme";

const LINKS = [
  { id: "overview", label: "Overview" },
  { id: "impact", label: "Impact" },
  { id: "model", label: "Model" },
  { id: "table", label: "Table" },
];

export default function TopBar({ active, apiState }) {
  const status = {
    ready: { cls: "ok", text: "API connected" },
    loading: { cls: "wait", text: "Connecting to the API…" },
    error: { cls: "bad", text: "API unreachable" },
  }[apiState];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#overview">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <rect width="32" height="32" fill="#2c3b66" />
            <path d="M5 23h10V11h12" fill="none" stroke="#f7941d" strokeWidth="4" />
          </svg>
          <span className="brand-name" translate="no">Brent Regime Lab</span>
          <span className="brand-sub">Analyst console</span>
        </a>
        <nav className="topnav" aria-label="Console sections">
          {LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} aria-current={active === l.id ? "true" : undefined}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="topbar-end">
          <span className={`api-status ${status.cls}`} role="status">
            <i aria-hidden="true" />
            {status.text}
          </span>
          <a className="topbar-link" href={PAGES_URL}>
            Case study
          </a>
        </div>
      </div>
    </header>
  );
}
