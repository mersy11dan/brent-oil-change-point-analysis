const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const toTime = (iso) => Date.parse(`${iso}T00:00:00Z`);

export function usd(n, digits = 2) {
  if (n == null || Number.isNaN(Number(n))) return "–";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function pct(n, digits = 1) {
  if (n == null || Number.isNaN(Number(n))) return "–";
  const v = Number(n);
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(digits)}%`;
}

export function day(iso) {
  if (!iso) return "–";
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function month(iso) {
  if (!iso) return "–";
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function yearOf(time) {
  return new Date(time).getUTCFullYear();
}

export function monthsBetween(a, b) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

export function distanceFromBreak(tau, iso) {
  const d = monthsBetween(tau, iso);
  if (d === 0) return "Same month as the break";
  const abs = Math.abs(d);
  const span = abs >= 24 ? `${(abs / 12).toFixed(1).replace(/\.0$/, "")} years` : `${abs} month${abs === 1 ? "" : "s"}`;
  return `${span} ${d > 0 ? "after" : "before"} the break`;
}

export const shortName = (name) => name.replace(/\s*\(.*\)\s*$/, "");
