import { useCallback, useEffect, useMemo, useState } from "react";
import EventDetail from "./components/EventDetail";
import EventList from "./components/EventList";
import ImpactChart from "./components/ImpactChart";
import ImpactTable from "./components/ImpactTable";
import ModelPanel from "./components/ModelPanel";
import PriceChart from "./components/PriceChart";
import Readout from "./components/Readout";
import { ApiError, ConsoleSkeleton } from "./components/States";
import Toolbar from "./components/Toolbar";
import TopBar from "./components/TopBar";
import { day, toTime } from "./format";
import { CATEGORIES, DATA_END, DATA_START, PAGES_URL, PRESETS } from "./theme";
import { downsample, useActiveSection, useAnalysis } from "./useDashboardData";

const SECTIONS = ["overview", "impact", "model", "table"];
const DEFAULT_RANGE = { start: DATA_START, end: DATA_END, preset: "all" };
const YEAR_MS = 365.25 * 864e5;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function readUrl() {
  const q = new URLSearchParams(window.location.search);
  const from = q.get("from");
  const to = q.get("to");
  const cat = q.get("category");
  const ev = q.get("event");
  const valid = from && to && ISO.test(from) && ISO.test(to);
  return {
    range: valid ? { start: from, end: to, preset: PRESETS.find((p) => p.start === from && p.end === to)?.id ?? null } : DEFAULT_RANGE,
    category: CATEGORIES.includes(cat) ? cat : "All",
    selected: ev && ISO.test(ev) ? { event_date: ev } : null,
  };
}

const clampIso = (t) => {
  const iso = new Date(t).toISOString().slice(0, 10);
  return iso < DATA_START ? DATA_START : iso > DATA_END ? DATA_END : iso;
};

export default function App() {
  const analysis = useAnalysis();
  const data = analysis.data;
  const [initial] = useState(readUrl);
  const [range, setRange] = useState(initial.range);
  const [category, setCategory] = useState(initial.category);
  const [selected, setSelected] = useState(initial.selected);

  useEffect(() => {
    const q = new URLSearchParams();
    if (range.preset !== "all") {
      q.set("from", range.start);
      q.set("to", range.end);
    }
    if (category !== "All") q.set("category", category);
    if (selected) q.set("event", selected.event_date);
    const search = q.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
  }, [range, category, selected]);
  const active = useActiveSection(SECTIONS, analysis.status === "ready");

  const rangeError = !range.start || !range.end
    ? "Enter both a start and an end date."
    : range.start > range.end
      ? "The start date must be on or before the end date."
      : "";

  const byCategory = useCallback(
    (list) => (category === "All" ? list : list.filter((r) => r.category === category)),
    [category],
  );
  const events = useMemo(() => byCategory(data?.events || []), [data, byCategory]);
  const impact = useMemo(() => byCategory(data?.impact || []), [data, byCategory]);
  const impactByDate = useMemo(() => new Map((data?.impact || []).map((r) => [r.event_date, r])), [data]);
  const counts = useMemo(() => {
    const c = { All: data?.events.length || 0 };
    for (const e of data?.events || []) c[e.category] = (c[e.category] || 0) + 1;
    return c;
  }, [data]);

  const daily = data?.prices || [];
  const inRange = useMemo(
    () => (rangeError ? [] : daily.filter((d) => d.date >= range.start && d.date <= range.end)),
    [daily, range.start, range.end, rangeError],
  );
  const chartData = useMemo(() => downsample(inRange), [inRange]);
  const inView = useMemo(() => {
    if (!inRange.length) return null;
    let lo = inRange[0].price;
    let hi = lo;
    let sum = 0;
    for (const d of inRange) {
      sum += d.price;
      if (d.price < lo) lo = d.price;
      if (d.price > hi) hi = d.price;
    }
    return { mean: sum / inRange.length, lo, hi };
  }, [inRange]);

  const selectedEvent = selected ? data?.events.find((e) => e.event_date === selected.event_date) || null : null;
  const selectedInRange = selectedEvent && selectedEvent.event_date >= range.start && selectedEvent.event_date <= range.end;

  const select = useCallback((ev) => setSelected(ev ? { event_date: ev.event_date } : null), []);
  const selectAndReveal = useCallback(
    (ev) => {
      select(ev);
      if (ev) requestAnimationFrame(() => document.getElementById("detail-title")?.scrollIntoView({ block: "center" }));
    },
    [select],
  );
  const zoomTo = useCallback((ev) => {
    const t = toTime(ev.event_date);
    setRange({ start: clampIso(t - 2 * YEAR_MS), end: clampIso(t + 2 * YEAR_MS), preset: null });
  }, []);
  const changeCategory = useCallback(
    (c) => {
      setCategory(c);
      if (selectedEvent && c !== "All" && selectedEvent.category !== c) setSelected(null);
    },
    [selectedEvent],
  );
  const reset = () => {
    setRange(DEFAULT_RANGE);
    setCategory("All");
    setSelected(null);
  };
  const isDefault = range.preset === "all" && category === "All" && !selected;

  return (
    <>
      <a className="skip" href="#main">
        Skip to the console
      </a>
      <TopBar active={active} apiState={analysis.status} />

      {analysis.status === "error" ? (
        <main id="main">
          <ApiError message={analysis.error} onRetry={analysis.reload} />
        </main>
      ) : !data ? (
        <main id="main">
          <ConsoleSkeleton />
        </main>
      ) : (
        <>
          <Toolbar
            range={range}
            onRange={setRange}
            category={category}
            onCategory={changeCategory}
            counts={counts}
            rangeError={rangeError}
            onReset={reset}
            isDefault={isDefault}
          />
          <main id="main" className="page">
            <section id="overview" aria-label="Overview">
              <Readout metrics={data.metrics} bayesian={data.changePoints?.bayesian} inView={inView} />
              <div className="overview">
                <PriceChart
                  prices={chartData}
                  range={range}
                  rangeError={rangeError}
                  bayesian={data.changePoints?.bayesian}
                  ruptures={data.changePoints?.ruptures || []}
                  events={events}
                  selected={selectedEvent}
                />
                <EventDetail
                  event={selectedEvent}
                  impact={selectedEvent ? impactByDate.get(selectedEvent.event_date) : null}
                  daily={daily}
                  tauDate={data.changePoints?.bayesian?.tau_date}
                  inRange={selectedInRange}
                  onZoom={zoomTo}
                  onClear={() => setSelected(null)}
                />
                <EventList
                  events={events}
                  impactByDate={impactByDate}
                  selected={selectedEvent}
                  onSelect={select}
                  range={range}
                  category={category}
                />
              </div>
            </section>

            <div className="analysis">
              <div id="impact">
                <ImpactChart impact={impact} selected={selectedEvent} onSelect={selectAndReveal} />
              </div>
              <div id="model">
                <ModelPanel changePoints={data.changePoints} modelError={data.modelError} />
              </div>
            </div>

            <ImpactTable impact={impact} selected={selectedEvent} onSelect={selectAndReveal} />

            <footer className="foot">
              <p>
                Daily Brent spot prices, {day(data.metrics.start_date)} to {day(data.metrics.end_date)}. Events are a
                curated list of fifteen; a break near an event is a match in time, not proof of cause.
              </p>
              <a className="text-link" href={PAGES_URL}>
                Read the case study
              </a>
            </footer>
          </main>
        </>
      )}
    </>
  );
}
