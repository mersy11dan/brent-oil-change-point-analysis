/* Brent Regime Lab — loads the exported analysis data and runs the page's working fragments. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const SVG_NS = "http://www.w3.org/2000/svg";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const usd = (n) => `$${Number(n).toFixed(2)}`;
const signed = (n, digits = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}`;
const monthShort = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const monthLong = (iso) => `${MONTHS_LONG[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const dayLong = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const ym = (iso) => iso.slice(0, 7);

function el(tag, attrs = {}, children = []) {
  const node = attrs.svg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "svg" || v == null) continue;
    if (k === "text") node.textContent = v;
    else if (k === "class") node.setAttribute("class", v);
    else if (k === "style") node.setAttribute("style", v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) node.append(c);
  return node;
}

async function loadData() {
  if (window.SITE_DATA) return window.SITE_DATA;
  const res = await fetch("./data/site_data.json");
  if (!res.ok) throw new Error(`site_data.json returned ${res.status}`);
  return res.json();
}

/* ---------- the break you can move ---------- */
function initBreaker(data) {
  const rows = data.monthly_prices;
  const n = rows.length;
  const p = rows.map((r) => r.price);
  const s1 = [0];
  const s2 = [0];
  for (let i = 0; i < n; i++) {
    s1.push(s1[i] + p[i]);
    s2.push(s2[i] + p[i] * p[i]);
  }
  const kMin = 6;
  const kMax = n - 6;
  const fit = (k) => {
    const a = s1[k] / k;
    const b = (s1[n] - s1[k]) / (n - k);
    const sse = s2[k] - (s1[k] * s1[k]) / k + (s2[n] - s2[k]) - ((s1[n] - s1[k]) ** 2) / (n - k);
    return { before: a, after: b, rmse: Math.sqrt(sse / n) };
  };
  const errors = [];
  let kBest = kMin;
  for (let k = kMin; k <= kMax; k++) {
    const e = fit(k).rmse;
    errors.push(e);
    if (e < fit(kBest).rmse) kBest = k;
  }
  const bayes = data.results.bayesian_change_point;
  const tauIdx = rows.findIndex((r) => r.date === bayes.tau_date);
  const kModel = tauIdx >= 0 ? tauIdx + 1 : kBest;
  const hdi = bayes.tau_hdi.map((d) => rows.findIndex((r) => ym(r.date) === ym(d)));

  const chart = $("#br-chart");
  const range = $("#br-range");
  const reset = $("#br-reset");
  const status = $("#br-status");
  const errorBox = $("#br-error");
  range.min = kMin;
  range.max = kMax;

  let k = kModel;
  let geom = null;
  const yMax = Math.ceil(Math.max(...p) / 50) * 50;

  function draw() {
    const w = chart.clientWidth;
    const h = chart.clientHeight;
    if (!w || !h) return;
    const m = { l: 40, r: 6, t: 22, b: 22 };
    const x = (i) => m.l + (i / (n - 1)) * (w - m.l - m.r);
    const y = (v) => m.t + (1 - v / yMax) * (h - m.t - m.b);
    geom = { x, m, w };

    const svg = el("svg", { svg: true, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": "Monthly Brent price from 1987 to 2022 with the selected break and the mean price either side" });
    for (let v = 50; v <= yMax; v += 50) {
      svg.append(el("line", { svg: true, x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), stroke: "#ecece8" }));
      svg.append(el("text", { svg: true, x: m.l - 8, y: y(v) + 4, "text-anchor": "end", text: `$${v}` }));
    }
    for (const yr of [1990, 2000, 2010, 2020]) {
      const i = rows.findIndex((r) => r.date.startsWith(String(yr)));
      if (i >= 0) svg.append(el("text", { svg: true, x: x(i), y: h - 4, "text-anchor": "middle", text: yr }));
    }
    if (hdi[0] >= 0 && hdi[1] >= 0) {
      svg.append(el("rect", { svg: true, x: x(hdi[0]), y: m.t, width: Math.max(2, x(hdi[1]) - x(hdi[0])), height: h - m.t - m.b, fill: "#f7941d", "fill-opacity": 0.16 }));
    }
    const line = p.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    svg.append(el("path", { svg: true, d: line, fill: "none", stroke: "#8a92a6", "stroke-width": 1.4, "stroke-linejoin": "round" }));

    const ghost = el("line", { svg: true, class: "ghost", y1: m.t, y2: h - m.b, stroke: "#1f2b4d", "stroke-dasharray": "3 4", "stroke-width": 1 });
    const ghostLabel = el("text", { svg: true, class: "ghost-label", y: m.t - 8, "text-anchor": "middle", text: "Model" });
    const step = el("path", { svg: true, class: "step", fill: "none", stroke: "#1f2b4d", "stroke-width": 2.5, "stroke-linejoin": "round" });
    const handle = el("line", { svg: true, class: "handle", y1: m.t - 4, y2: h - m.b, stroke: "#f7941d", "stroke-width": 2.5 });
    const knob = el("circle", { svg: true, class: "knob", cy: m.t - 4, r: 7, fill: "#f7941d", stroke: "#fff", "stroke-width": 2 });
    svg.append(ghost, ghostLabel, step, handle, knob);
    chart.replaceChildren(svg);
    geom.svg = { ghost, ghostLabel, step, handle, knob, y };

    const ew = 168;
    const eh = 34;
    const eMax = Math.max(...errors);
    const eMin = Math.min(...errors);
    const ex = (kk) => ((kk - kMin) / (kMax - kMin)) * ew;
    const ey = (e) => 3 + (1 - (e - eMin) / (eMax - eMin)) * (eh - 6);
    const espark = el("svg", { svg: true, viewBox: `0 0 ${ew} ${eh}`, preserveAspectRatio: "none" });
    espark.append(el("path", { svg: true, d: errors.map((e, i) => `${i ? "L" : "M"}${ex(i + kMin).toFixed(1)},${ey(e).toFixed(1)}`).join(""), fill: "none", stroke: "#1f2b4d", "stroke-width": 1.5, "vector-effect": "non-scaling-stroke" }));
    const dot = el("circle", { svg: true, r: 3.5, fill: "#f7941d", stroke: "#fff", "stroke-width": 1.5, "vector-effect": "non-scaling-stroke" });
    espark.append(dot);
    errorBox.replaceChildren(espark);
    geom.err = { dot, ex, ey };
    update();
  }

  function update() {
    const f = fit(k);
    $("#br-month").textContent = monthShort(rows[k - 1].date);
    $("#br-before").textContent = usd(f.before);
    $("#br-after").textContent = usd(f.after);
    $("#br-rmse").textContent = usd(f.rmse);
    range.value = k;
    range.setAttribute("aria-valuetext", `Break after ${monthLong(rows[k - 1].date)}`);
    reset.disabled = k === kModel;

    if (k === kBest && kBest === kModel) {
      status.textContent = `Lowest error of all ${kMax - kMin + 1} possible months, and the same month the Bayesian model chose.`;
    } else if (k === kBest) {
      status.textContent = `Lowest error of all ${kMax - kMin + 1} possible months.`;
    } else {
      const worse = ((f.rmse / fit(kBest).rmse - 1) * 100).toFixed(1);
      status.textContent = `${worse}% more error than a break after ${monthLong(rows[kBest - 1].date)}.`;
    }

    if (!geom || !geom.svg) return;
    const { x } = geom;
    const { ghost, ghostLabel, step, handle, knob, y } = geom.svg;
    const xb = x(k - 0.5);
    step.setAttribute("d", `M${x(0)},${y(f.before)}H${xb}V${y(f.after)}H${x(n - 1)}`);
    handle.setAttribute("x1", xb);
    handle.setAttribute("x2", xb);
    knob.setAttribute("cx", xb);
    const xm = x(kModel - 0.5);
    const showGhost = k !== kModel;
    for (const g of [ghost, ghostLabel]) g.style.display = showGhost ? "" : "none";
    ghost.setAttribute("x1", xm);
    ghost.setAttribute("x2", xm);
    ghostLabel.setAttribute("x", xm);
    ghostLabel.style.fill = "#1f2b4d";
    const { dot, ex, ey } = geom.err;
    dot.setAttribute("cx", ex(k));
    dot.setAttribute("cy", ey(f.rmse));
  }

  const setK = (next) => {
    const clamped = Math.max(kMin, Math.min(kMax, Math.round(next)));
    if (clamped === k) return;
    k = clamped;
    update();
  };

  range.addEventListener("input", () => setK(Number(range.value)));
  reset.addEventListener("click", () => setK(kModel));

  let dragging = false;
  const fromPointer = (evt) => {
    if (!geom) return;
    const rect = chart.getBoundingClientRect();
    const px = evt.clientX - rect.left;
    const { m, w } = geom;
    const i = ((px - m.l) / (w - m.l - m.r)) * (n - 1);
    setK(i + 0.5);
  };
  chart.addEventListener("pointerdown", (evt) => {
    dragging = true;
    chart.setPointerCapture(evt.pointerId);
    fromPointer(evt);
  });
  chart.addEventListener("pointermove", (evt) => dragging && fromPointer(evt));
  const stop = () => { dragging = false; };
  chart.addEventListener("pointerup", stop);
  chart.addEventListener("pointercancel", stop);

  new ResizeObserver(draw).observe(chart);
  draw();
}

/* ---------- ask the series ---------- */
const EVENT_ALIASES = [
  [/gulf war|kuwait|1990 war/, "1990-08-02"],
  [/asian/, "1997-07-02"],
  [/overproduc|1998 collapse/, "1998-12-01"],
  [/9\/11|september 11|sept 11|twin towers/, "2001-09-11"],
  [/iraq war|invasion of iraq|iraq invasion|^iraq$/, "2003-03-20"],
  [/peak|record high|\$147/, "2008-07-11"],
  [/lehman|financial crisis|gfc|credit crunch/, "2008-09-15"],
  [/arab spring|libya/, "2011-02-15"],
  [/shale|declines to cut|2014 crash/, "2014-11-27"],
  [/trough/, "2016-01-20"],
  [/opec\+? ?(production )?cut agreement|opec plus|vienna/, "2016-11-30"],
  [/iran|nuclear deal|jcpoa|sanction/, "2018-05-08"],
  [/covid|pandemic|corona|price war|lockdown/, "2020-03-08"],
  [/record (production )?cut/, "2020-04-12"],
  [/ukraine|russia/, "2022-02-24"],
];

function initAsk(data) {
  const input = $("#ask-input");
  const answer = $("#ask-answer");
  const caret = $(".ask-caret");
  const rows = data.monthly_prices;
  const byMonth = new Map(rows.map((r, i) => [ym(r.date), { ...r, i }]));
  const events = data.events;
  const impact = new Map((data.results.event_impact || []).map((r) => [r.event_date, r]));
  const bayes = data.results.bayesian_change_point;
  const tau = bayes.tau_date;
  const first = rows[0].date;
  const last = rows[rows.length - 1].date;

  const regime = (iso) => (ym(iso) <= ym(tau)
    ? { v: "Before the break", mean: bayes.mu_before }
    : { v: "After the break", mean: bayes.mu_after });

  const monthsBetween = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));
  const distance = (fromIso, toIso) => {
    const d = monthsBetween(fromIso, toIso);
    if (d === 0) return "same month";
    const abs = Math.abs(d);
    const span = abs >= 24 ? `${(abs / 12).toFixed(1).replace(/\.0$/, "")} years` : `${abs} month${abs === 1 ? "" : "s"}`;
    return `${span} ${d > 0 ? "later" : "earlier"}`;
  };

  function row(k, v, note) {
    return el("div", { class: "answer-row" }, [
      el("dt", { class: "k", text: k }),
      el("dd", { class: "v", text: v }),
      note ? el("dd", { class: "n", text: note }) : null,
    ]);
  }

  function nearestEvent(iso) {
    let best = null;
    for (const ev of events) {
      const d = Math.abs(monthsBetween(iso, ev.event_date));
      if (!best || d < best.d) best = { ev, d };
    }
    return best.ev;
  }

  const chartBox = $("#ask-chart");
  const chartTitle = $("#ask-context-title");
  const defaultTitle = chartTitle.textContent;
  const n = rows.length;
  const tauIdx = rows.findIndex((r) => ym(r.date) === ym(tau));
  const idxOf = (iso) => (byMonth.get(ym(iso)) || {}).i;
  let lastFocus = null;

  function niceStep(range) {
    for (const s of [5, 10, 20, 25, 50, 100]) if (range / s <= 5) return s;
    return 100;
  }

  function drawContext(focus) {
    lastFocus = focus;
    if (!focus) {
      chartTitle.textContent = defaultTitle;
      chartBox.replaceChildren();
      return;
    }
    const w = chartBox.clientWidth;
    const h = chartBox.clientHeight;
    if (!w || !h) return;

    const span = 36;
    const width = focus.to - focus.from + span * 2;
    let a = Math.max(0, focus.from - span);
    let b = Math.min(n - 1, a + width);
    a = Math.max(0, b - width);
    const win = rows.slice(a, b + 1);
    chartTitle.textContent = `Monthly Brent average, ${monthShort(rows[a].date)} to ${monthShort(rows[b].date)}${focus.note ? `, ${focus.note}` : ""}`;

    const vals = win.map((r) => r.price).concat(a <= tauIdx ? [bayes.mu_before] : [], b > tauIdx ? [bayes.mu_after] : []);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const step = niceStep(hi - lo);
    const yLo = Math.max(0, Math.floor(lo / step) * step);
    const yHi = Math.ceil(hi / step) * step;
    const m = { l: 40, r: 8, t: 30, b: 24 };
    const x = (i) => m.l + ((i - a) / (b - a)) * (w - m.l - m.r);
    const y = (v) => m.t + (1 - (v - yLo) / (yHi - yLo)) * (h - m.t - m.b);

    const svg = el("svg", { svg: true, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": `Monthly Brent price from ${monthLong(rows[a].date)} to ${monthLong(rows[b].date)}` });
    for (let v = yLo; v <= yHi; v += step) {
      svg.append(el("line", { svg: true, x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), stroke: "#dcdcd6" }));
      svg.append(el("text", { svg: true, x: m.l - 8, y: y(v) + 4, "text-anchor": "end", text: `$${v}` }));
    }
    const everyYears = w < 420 ? 2 : 1;
    win.forEach((r, j) => {
      const yr = Number(r.date.slice(0, 4));
      if (Number(r.date.slice(5, 7)) === 1 && yr % everyYears === 0) {
        svg.append(el("text", { svg: true, x: x(a + j), y: h - 4, "text-anchor": "middle", text: yr }));
      }
    });

    const x0 = x(Math.max(a, focus.from - 0.5));
    const x1 = x(Math.min(b, focus.to + 0.5));
    svg.append(el("rect", { svg: true, x: x0, y: m.t, width: Math.max(3, x1 - x0), height: h - m.t - m.b, fill: "#f7941d", "fill-opacity": 0.22 }));

    if (tauIdx >= a && tauIdx <= b) {
      const xt = x(tauIdx + 0.5);
      svg.append(el("line", { svg: true, x1: xt, x2: xt, y1: m.t - 6, y2: h - m.b, stroke: "#1f2b4d", "stroke-dasharray": "3 4" }));
      svg.append(el("text", { svg: true, x: xt, y: m.t - 12, "text-anchor": xt > w - 60 ? "end" : "middle", text: "Break" }));
    }
    const meanSeg = (from, to, mean) => {
      if (to < from) return;
      svg.append(el("line", { svg: true, x1: x(from), x2: x(to), y1: y(mean), y2: y(mean), stroke: "#1f2b4d", "stroke-width": 1.5, "stroke-opacity": 0.45 }));
    };
    meanSeg(a, Math.min(b, tauIdx), bayes.mu_before);
    meanSeg(Math.max(a, tauIdx + 1), b, bayes.mu_after);

    const line = win.map((r, j) => `${j ? "L" : "M"}${x(a + j).toFixed(1)},${y(r.price).toFixed(1)}`).join("");
    svg.append(el("path", { svg: true, d: line, fill: "none", stroke: "#1f2b4d", "stroke-width": 2, "stroke-linejoin": "round" }));

    const xf = x(focus.at);
    const yf = y(rows[focus.at].price);
    svg.append(el("circle", { svg: true, cx: xf, cy: yf, r: 5, fill: "#f7941d", stroke: "#fff", "stroke-width": 2 }));
    const anchor = xf < m.l + 50 ? "start" : xf > w - m.r - 50 ? "end" : "middle";
    const labelY = yf - 14 < m.t ? yf + 24 : yf - 14;
    svg.append(el("text", { svg: true, class: "focus", x: xf, y: labelY, "text-anchor": anchor, text: focus.label }));
    chartBox.replaceChildren(svg);
  }

  function parse(raw) {
    const q = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!q) return { kind: "empty" };
    let mo = null;
    let yr = null;
    let m = q.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,? (\d{4})\b/);
    if (m) { mo = MONTHS.findIndex((s) => s.toLowerCase() === m[1]) + 1; yr = Number(m[2]); }
    if (!mo) {
      m = q.match(/\b(\d{4})[-/.](\d{1,2})\b/) || null;
      if (m) { yr = Number(m[1]); mo = Number(m[2]); }
    }
    if (!mo) {
      m = q.match(/\b(\d{1,2})[-/.](\d{4})\b/);
      if (m) { mo = Number(m[1]); yr = Number(m[2]); }
    }
    if (mo && yr && mo >= 1 && mo <= 12) return { kind: "month", key: `${yr}-${String(mo).padStart(2, "0")}` };
    for (const [re, date] of EVENT_ALIASES) if (re.test(q)) return { kind: "event", date };
    m = q.match(/^(?:in )?(\d{4})$/);
    if (m) return { kind: "year", year: Number(m[1]) };
    const words = q.split(/[^a-z0-9+]+/).filter((w) => w.length > 3);
    let best = null;
    for (const ev of events) {
      const hay = `${ev.event_name} ${ev.category}`.toLowerCase();
      const score = words.filter((w) => hay.includes(w)).length;
      if (score && (!best || score > best.score)) best = { score, date: ev.event_date };
    }
    if (best) return { kind: "event", date: best.date };
    return { kind: "none" };
  }

  function render() {
    const query = input.value;
    const res = parse(query);
    let out = [];
    let focus = null;
    if (res.kind === "month") {
      const r = byMonth.get(res.key);
      if (!r) {
        out = [el("p", { class: "answer-empty", text: `Brent data here runs from ${monthLong(first)} to ${monthLong(last)}. Try a month in that span.` })];
      } else {
        const prev = rows[r.i - 1];
        const reg = regime(r.date);
        const ev = nearestEvent(r.date);
        const imp = impact.get(ev.event_date);
        out = [
          row("Average price", usd(r.price), prev ? `${monthLong(r.date)}, ${signed(((r.price / prev.price) - 1) * 100)}% on ${MONTHS_LONG[Number(prev.date.slice(5, 7)) - 1]}` : monthLong(r.date)),
          row("Regime", reg.v, `Regime mean ${usd(reg.mean)}, so this month sits ${usd(Math.abs(r.price - reg.mean))} ${r.price >= reg.mean ? "above" : "below"} it`),
          row("Nearest event", ev.event_name, `${dayLong(ev.event_date)}, ${distance(r.date, ev.event_date)}${imp ? `. Price moved ${signed(imp.price_pct_change)}% over 90 days` : ""}`),
        ];
        focus = { from: r.i, to: r.i, at: r.i, label: usd(r.price) };
      }
    } else if (res.kind === "year") {
      const inYear = rows.filter((r) => r.date.startsWith(String(res.year)));
      if (!inYear.length) {
        out = [el("p", { class: "answer-empty", text: `Brent data here runs from ${first.slice(0, 4)} to ${last.slice(0, 4)}. Try a year in that span.` })];
      } else {
        const avg = inYear.reduce((s, r) => s + r.price, 0) / inYear.length;
        const lo = inYear.reduce((a, b) => (b.price < a.price ? b : a));
        const hi = inYear.reduce((a, b) => (b.price > a.price ? b : a));
        const evs = events.filter((e) => e.event_date.startsWith(String(res.year)));
        const reg = regime(`${res.year}-06-30`);
        out = [
          row("Average price", usd(avg), `${res.year}, from ${usd(lo.price)} in ${MONTHS_LONG[Number(lo.date.slice(5, 7)) - 1]} to ${usd(hi.price)} in ${MONTHS_LONG[Number(hi.date.slice(5, 7)) - 1]}`),
          row("Regime", String(res.year) === tau.slice(0, 4) ? "The break year" : reg.v, String(res.year) === tau.slice(0, 4) ? `The model places the break after ${monthLong(tau)}` : `Regime mean ${usd(reg.mean)}`),
          evs.length
            ? row(evs.length === 1 ? "Event that year" : "Events that year", evs.map((e) => e.event_name).join(", "), evs.length === 1 ? dayLong(evs[0].event_date) : `${evs.length} curated events`)
            : row("Nearest event", nearestEvent(`${res.year}-06-30`).event_name, dayLong(nearestEvent(`${res.year}-06-30`).event_date)),
        ];
        focus = { from: idxOf(inYear[0].date), to: idxOf(inYear[inYear.length - 1].date), at: idxOf(hi.date), label: `High ${usd(hi.price)}`, note: `${res.year} shaded` };
      }
    } else if (res.kind === "event") {
      const ev = events.find((e) => e.event_date === res.date);
      const imp = impact.get(res.date);
      const reg = regime(ev.event_date);
      out = [
        row("Event", ev.event_name, `${dayLong(ev.event_date)}, ${ev.category}`),
        imp ? row("90-day move", `${signed(imp.price_pct_change)}%`, `${usd(imp.price_before)} on average before, ${usd(imp.price_after)} after`) : null,
        row("Regime", reg.v, `${distance(tau, ev.event_date).replace("later", "after").replace("earlier", "before")} the break`),
      ];
      const at = idxOf(ev.event_date);
      if (at != null) focus = { from: at, to: at, at, label: `${usd(rows[at].price)} in ${monthShort(ev.event_date)}` };
    } else if (res.kind === "empty") {
      out = [el("p", { class: "answer-empty", text: "Type a month such as “March 2020”, a year, or an event such as “Lehman”." })];
    } else {
      out = [el("p", { class: "answer-empty", text: `Nothing matched “${query.trim()}”. Try a month such as “March 2020”, a year, or an event such as “Lehman”.` })];
    }
    answer.replaceChildren(el("dl", { style: "display:grid;gap:4px;margin:0" }, out));
    drawContext(focus);
    placeCaret();
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  function placeCaret() {
    const cs = getComputedStyle(input);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = cs.letterSpacing;
    const wText = ctx.measureText(input.value).width;
    const max = input.clientWidth - 12;
    caret.style.transform = `translateX(${Math.min(wText + 6, max)}px)`;
  }

  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
  for (const b of $$(".ask-chips button")) {
    b.addEventListener("click", () => {
      input.value = b.dataset.q;
      render();
    });
  }
  window.addEventListener("resize", placeCaret);
  if (document.fonts) document.fonts.ready.then(placeCaret);
  new ResizeObserver(() => drawContext(lastFocus)).observe(chartBox);
  render();
}

/* ---------- bars standing on the edge ---------- */
function initBars(data) {
  const box = $("#bars");
  const years = [];
  for (let y = 1998; y <= 2011; y++) years.push(y);
  const annual = years.map((y) => {
    const inYear = data.monthly_prices.filter((r) => r.date.startsWith(String(y)));
    return { y, v: inYear.reduce((s, r) => s + r.price, 0) / inYear.length };
  });
  const max = Math.max(...annual.map((a) => a.v));
  const mobileSet = annual.filter((a) => a.y >= 2001 && a.y <= 2008);
  const maxM = Math.max(...mobileSet.map((a) => a.v));
  const breakYear = Number(data.results.bayesian_change_point.tau_date.slice(0, 4));
  const labelled = new Set([1998, breakYear, 2008]);
  const labelledM = new Set([2001, breakYear, 2008]);

  annual.forEach((a, i) => {
    const wide = a.y < 2001 || a.y > 2008;
    const cls = [
      a.y === breakYear ? "is-break" : a.y > breakYear ? "after" : "",
      labelled.has(a.y) ? "labelled" : "",
      labelledM.has(a.y) ? "labelled-m" : "",
      wide ? "wide-only" : "",
      a.v / maxM < 0.42 ? "short" : "",
    ].filter(Boolean).join(" ");
    box.append(el("li", {
      class: cls,
      tabindex: 0,
      "aria-label": `${a.y}: average ${usd(a.v)} a barrel`,
      style: `--h:${(a.v / max).toFixed(4)};--hm:${(a.v / maxM).toFixed(4)};--i:${i}`,
    }, [
      el("span", { class: "bar-label", "aria-hidden": "true" }, [usd(a.v), el("small", { text: String(a.y) })]),
      el("span", { class: "bar" }),
    ]));
  });
}

/* ---------- events ---------- */
function initEvents(data) {
  const order = ["All", "Conflict", "OPEC", "Economic", "Sanctions", "Pandemic"];
  const impact = new Map((data.results.event_impact || []).map((r) => [r.event_date, r]));
  const events = data.events;
  const maxAbs = Math.max(...[...impact.values()].map((r) => Math.abs(r.price_pct_change)));
  const tabs = $("#tabs");
  const bands = $("#bands");
  let current = "All";

  const counts = (cat) => (cat === "All" ? events.length : events.filter((e) => e.category === cat).length);
  const cats = order.filter((c) => counts(c) > 0);
  const buttons = cats.map((cat) => el("button", {
    class: "tab", type: "button", role: "tab", id: `tab-${cat.toLowerCase()}`,
    "aria-selected": String(cat === current), "aria-controls": "bands", tabindex: cat === current ? 0 : -1, "data-cat": cat,
  }, [
    el("span", { class: "t-name", text: cat === "All" ? "All events" : cat }),
    el("span", { class: "t-count", text: `${counts(cat)} event${counts(cat) === 1 ? "" : "s"}` }),
  ]));
  tabs.append(...buttons);
  bands.setAttribute("role", "tabpanel");

  function render() {
    const list = current === "All" ? events : events.filter((e) => e.category === current);
    bands.setAttribute("aria-labelledby", `tab-${current.toLowerCase()}`);
    bands.replaceChildren(...list.map((ev, i) => {
      const imp = impact.get(ev.event_date);
      const pct = imp ? imp.price_pct_change : null;
      const dir = pct != null && pct < 0 ? "down" : "up";
      return el("li", { class: "band", style: `--i:${i}` }, [
        el("time", { datetime: ev.event_date, text: dayLong(ev.event_date) }),
        el("div", { class: "band-title" }, [
          el("strong", { text: ev.event_name }),
          el("span", {}, [el("span", { class: "band-cat", text: `${ev.category}. ` }), ev.description]),
        ]),
        imp ? el("div", { class: "band-move" }, [
          el("span", { class: "band-prices", text: `${usd(imp.price_before)} → ${usd(imp.price_after)}` }),
          el("span", { class: `band-pct ${dir}`, text: `${signed(pct)}%` }),
          el("span", { class: "band-bar", "aria-hidden": "true" }, [
            el("i", { class: dir === "down" ? "down" : "", style: `--w:${(Math.abs(pct) / maxAbs).toFixed(3)}` }),
          ]),
        ]) : el("div"),
      ]);
    }));
  }

  function select(cat, focus) {
    current = cat;
    for (const b of buttons) {
      const on = b.dataset.cat === cat;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    render();
  }

  tabs.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (b) select(b.dataset.cat, false);
  });
  tabs.addEventListener("keydown", (e) => {
    const i = cats.indexOf(current);
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (e.key in keys) {
      e.preventDefault();
      select(cats[(i + keys[e.key] + cats.length) % cats.length], true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      select(cats[e.key === "Home" ? 0 : cats.length - 1], true);
    }
  });
  render();
}

/* ---------- method: pinned fragment changes with the statements ---------- */
function initMethod() {
  const frag = $("#method-fragment");
  const steps = $$(".method-step");
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      for (const s of steps) s.classList.toggle("is-active", s === e.target);
      frag.dataset.state = e.target.dataset.step;
    }
  }, { rootMargin: window.matchMedia("(max-width: 900px)").matches ? "-62% 0px -28% 0px" : "-45% 0px -45% 0px" });
  steps.forEach((s) => io.observe(s));
}

/* ---------- reveals, count and clock ---------- */
function initReveals() {
  const targets = $$("[data-reveal], .bars");
  if (!("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-in");
      if (e.target.id === "stats-figure") countUp();
      io.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  targets.forEach((t) => io.observe(t));
  window.addEventListener("load", () => setTimeout(() => {
    targets.forEach((t) => {
      const r = t.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) t.classList.add("is-in");
    });
  }, 2500));
}

let counted = false;
function countUp() {
  if (counted) return;
  counted = true;
  const node = $("#stats-count");
  const target = Math.round(Number(node.dataset.target || 253));
  if (reducedMotion) return;
  const start = performance.now();
  const dur = 1200;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - (1 - t) ** 3;
    node.textContent = `+${Math.round(target * eased)}%`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initClock() {
  const node = $("#lerwick-time");
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const tick = () => { node.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 30000);
}

async function main() {
  initReveals();
  initMethod();
  initClock();
  try {
    const data = await loadData();
    const pct = data.results.bayesian_change_point.pct_change;
    $("#stats-count").dataset.target = pct;
    $("#stats-count").textContent = `+${Math.round(pct)}%`;
    initBreaker(data);
    initAsk(data);
    initBars(data);
    initEvents(data);
  } catch (err) {
    const msg = `The analysis data did not load (${err.message}). Run python scripts/build_portfolio_site.py, then serve the docs folder.`;
    $("#br-status").textContent = msg;
    $("#ask-answer").replaceChildren(el("p", { class: "answer-empty", text: msg }));
  }
}

main();
