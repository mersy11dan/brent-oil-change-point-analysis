import { useMemo, useState } from "react";
import { day, pct, usd } from "../format";

const COLUMNS = [
  { key: "event_date", label: "Date", num: false },
  { key: "event_name", label: "Event", num: false },
  { key: "category", label: "Category", num: false },
  { key: "price_before", label: "Before", num: true },
  { key: "price_after", label: "After", num: true },
  { key: "price_pct_change", label: "Change", num: true },
  { key: "vol_before", label: "Volatility before", num: true },
  { key: "vol_after", label: "Volatility after", num: true },
];

export default function ImpactTable({ impact, selected, onSelect }) {
  const [sort, setSort] = useState({ key: "event_date", dir: "asc" });

  const rows = useMemo(() => {
    const list = [...impact];
    const { key, dir } = sort;
    list.sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [impact, sort]);

  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "event_date" || key === "event_name" || key === "category" ? "asc" : "desc" }));

  return (
    <section className="panel table-panel" id="table" aria-labelledby="table-title">
      <div className="panel-head">
        <div>
          <h2 id="table-title">Event impacts</h2>
          <p className="panel-sub">Average price and volatility of daily log returns in the 90 days either side of each event</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty">
          <p>No events in this category.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Event impacts, sortable by any column</caption>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.num ? "num" : ""}
                    aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button type="button" className="sort" onClick={() => toggle(c.key)}>
                      {c.label}
                      <span className="sort-mark" aria-hidden="true">
                        {sort.key === c.key ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOn = selected?.event_date === r.event_date;
                return (
                  <tr key={`${r.event_date}-${r.event_name}`} className={isOn ? "is-selected" : ""}>
                    <td className="nowrap">{day(r.event_date)}</td>
                    <td>
                      <button type="button" className="row-link" aria-pressed={isOn} onClick={() => onSelect(isOn ? null : r)}>
                        {r.event_name}
                      </button>
                    </td>
                    <td>{r.category}</td>
                    <td className="num">{usd(r.price_before)}</td>
                    <td className="num">{usd(r.price_after)}</td>
                    <td className={`num strong ${r.price_pct_change < 0 ? "down" : ""}`}>{pct(r.price_pct_change)}</td>
                    <td className="num">{r.vol_before.toFixed(4)}</td>
                    <td className="num">{r.vol_after.toFixed(4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
