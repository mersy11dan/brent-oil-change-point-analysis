const BASE = import.meta.env.VITE_API_URL || "";

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.pathname + url.search);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const fetchMetrics = () => get("/api/metrics");
export const fetchPrices = (params) => get("/api/prices", params);
export const fetchEvents = (params) => get("/api/events", params);
export const fetchChangePoints = () => get("/api/change-points");
export const fetchEventImpact = (params) => get("/api/event-impact", params);
