export const C = {
  ink: "#1f2b4d",
  muted: "#5f667b",
  faint: "#c3c7d2",
  grid: "#e7e6e1",
  surface: "#f4f4f2",
  accent: "#f7941d",
  down: "#b42345",
};

export const axisTick = { fill: C.muted, fontSize: 12, fontFamily: "Work Sans, system-ui, sans-serif" };

export const CATEGORIES = ["All", "Conflict", "OPEC", "Economic", "Sanctions", "Pandemic"];

export const PRESETS = [
  { id: "all", label: "All years", start: "1987-05-20", end: "2022-11-14" },
  { id: "break", label: "Around the break", start: "2002-01-01", end: "2008-06-30" },
  { id: "gfc", label: "2008 crisis", start: "2007-01-01", end: "2009-12-31" },
  { id: "shale", label: "Shale and OPEC", start: "2014-01-01", end: "2017-12-31" },
  { id: "recent", label: "Pandemic and Ukraine", start: "2019-06-01", end: "2022-11-14" },
];

export const DATA_START = PRESETS[0].start;
export const DATA_END = PRESETS[0].end;

export const PAGES_URL = "https://mersy11dan.github.io/brent-oil-change-point-analysis/";
