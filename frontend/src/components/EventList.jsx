import { useEffect, useRef } from "react";
import { day, pct } from "../format";

export default function EventList({ events, impactByDate, selected, onSelect, range, category }) {
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector('[aria-pressed="true"]');
    if (!row) return;
    const top = row.offsetTop;
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: Math.max(0, top - list.clientHeight / 3), behavior: "smooth" });
    }
  }, [selected]);

  return (
    <section className="panel list-panel" aria-labelledby="events-title">
      <div className="panel-head">
        <div>
          <h2 id="events-title">Events</h2>
          <p className="panel-sub">
            {events.length} {category === "All" ? "curated" : category} event{events.length === 1 ? "" : "s"}, with the
            change in average price over 90 days
          </p>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="empty">
          <p>No events in this category.</p>
          <p>Choose All events in the filter bar.</p>
        </div>
      ) : (
        <ul className="event-list" ref={listRef}>
          {events.map((ev) => {
            const imp = impactByDate.get(ev.event_date);
            const outside = ev.event_date < range.start || ev.event_date > range.end;
            const isOn = selected?.event_date === ev.event_date;
            return (
              <li key={`${ev.event_date}-${ev.event_name}`}>
                <button
                  type="button"
                  className={`event-row ${outside ? "is-outside" : ""}`}
                  aria-pressed={isOn}
                  onClick={() => onSelect(isOn ? null : ev)}
                >
                  <span className="er-date">{day(ev.event_date)}</span>
                  <span className="er-name">{ev.event_name}</span>
                  <span className="er-meta">
                    {ev.category}
                    {outside ? ", outside the range" : ""}
                  </span>
                  {imp && (
                    <span className={`er-move ${imp.price_pct_change < 0 ? "down" : ""}`}>{pct(imp.price_pct_change)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
