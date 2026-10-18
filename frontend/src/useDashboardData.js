import { useCallback, useEffect, useState } from "react";
import {
  fetchChangePoints,
  fetchEventImpact,
  fetchEvents,
  fetchMetrics,
  fetchPrices,
} from "./api";
import { DATA_END, DATA_START } from "./theme";

/* The full daily series is about 9,000 rows, so it loads once and every filter runs in memory.
   That keeps range statistics exact; the API's own downsampling skips days and can miss the
   true low or high. */
export function useAnalysis() {
  const [state, setState] = useState({ status: "loading", data: null, error: "" });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", error: "" }));
    try {
      const [metrics, prices, events, impact, changePoints] = await Promise.all([
        fetchMetrics(),
        fetchPrices({ start: DATA_START, end: DATA_END, max_points: 20000 }),
        fetchEvents(),
        fetchEventImpact(),
        fetchChangePoints().catch((err) => ({ missing: true, error: err.message })),
      ]);
      setState({
        status: "ready",
        error: "",
        data: {
          metrics,
          prices: prices.data || [],
          events: events.data || [],
          impact: impact.data || [],
          changePoints: changePoints.missing ? null : changePoints,
          modelError: changePoints.missing ? changePoints.error : "",
        },
      });
    } catch (err) {
      setState({ status: "error", data: null, error: err.message || "The API did not respond." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/* Keeps each bucket's lowest and highest day so spikes and troughs survive. */
export function downsample(rows, target = 1600) {
  if (rows.length <= target) return rows;
  const size = Math.ceil(rows.length / (target / 2));
  const out = [];
  for (let i = 0; i < rows.length; i += size) {
    let lo = rows[i];
    let hi = rows[i];
    for (let j = i + 1; j < Math.min(i + size, rows.length); j++) {
      if (rows[j].price < lo.price) lo = rows[j];
      if (rows[j].price > hi.price) hi = rows[j];
    }
    if (lo === hi) out.push(lo);
    else if (lo.date < hi.date) out.push(lo, hi);
    else out.push(hi, lo);
  }
  return out;
}

export function useActiveSection(ids, ready) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (!ready || !("IntersectionObserver" in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) io.observe(node);
    }
    return () => io.disconnect();
  }, [ids, ready]);
  return active;
}
