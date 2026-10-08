/**
 * Savings calculator. Presets or sliders in; hours and rupees out, for a month, a year, three years or any custom span.
 * The same math renders on the server (so it reads correctly without JS) and updates live here,
 * with numbers counting to their new values and the chart re-drawing.
 */
export type Inputs = { projects: number; value: number; hours: number; leak: number };
export type Assumptions = { timePct: number; leakPct: number; hourly: number };
export type Period = "month" | "year" | "3y" | "custom";

export const SLIDERS = [
  { key: "projects", label: "Projects a year", min: 4, max: 200, step: 1, def: 24, fmt: (v: number) => String(v), ends: ["4", "200"] },
  { key: "value", label: "Average project value", min: 5, max: 300, step: 5, def: 25, fmt: (v: number) => (v >= 100 ? `₹${+(v / 100).toFixed(2)} Cr` : `₹${v} L`), ends: ["₹5 L", "₹3 Cr"] },
  { key: "hours", label: "Hours on estimates and BOQ revisions, per project", min: 2, max: 60, step: 1, def: 14, fmt: (v: number) => `${v} hrs`, ends: ["2 hrs", "60 hrs"] },
  { key: "leak", label: "Margin lost to re-typing, missed change orders and unbilled extras", min: 0.5, max: 8, step: 0.5, def: 3, fmt: (v: number) => `${v}%`, ends: ["0.5%", "8%"] },
] as const;

export const PRESETS: { id: string; label: string; v: Inputs }[] = [
  { id: "studio", label: "Interiors studio", v: { projects: 24, value: 25, hours: 14, leak: 3 } },
  { id: "contractor", label: "Contractor", v: { projects: 40, value: 60, hours: 20, leak: 3.5 } },
  { id: "builder", label: "Builder", v: { projects: 12, value: 250, hours: 40, leak: 4 } },
];

export const PERIODS: { id: Period; label: string; months: number; lead: string }[] = [
  { id: "month", label: "Month", months: 1, lead: "You could get back, every month" },
  { id: "year", label: "Year", months: 12, lead: "You could get back, every year" },
  { id: "3y", label: "3 years", months: 36, lead: "You could get back over three years" },
];

/** A custom length typed by the visitor, in months or years, clamped to 1 month – 20 years. */
export const span = (n: number, unit: "months" | "years") => Math.round(Math.min(240, Math.max(1, (unit === "years" ? n * 12 : n) || 1)));
export const spanLabel = (m: number) => (m % 12 === 0 ? `${m / 12} year${m === 12 ? "" : "s"}` : `${m} month${m === 1 ? "" : "s"}`);

export function compute(i: Inputs, a: Assumptions, months = 12) {
  const k = months / 12;
  const hoursAll = i.projects * i.hours * k;
  const hoursBack = Math.round(hoursAll * (a.timePct / 100));
  const timeValue = hoursBack * a.hourly;
  const turnover = i.projects * i.value * 1e5 * k;
  const leakToday = turnover * (i.leak / 100);
  const marginBack = leakToday * (a.leakPct / 100);
  const costToday = leakToday + hoursAll * a.hourly;
  const total = timeValue + marginBack;
  return { hoursBack, timeValue, turnover, leakToday, marginBack, costToday, costAfter: costToday - total, total, pctOfTurnover: turnover ? (total / turnover) * 100 : 0 };
}

export function inr(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 1 : 2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 1 : 2)} L`;
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/** Cumulative cost of re-typing, today vs on one ledger, as SVG paths in a 320×132 box. */
export function chart(today: number, after: number, steps: number) {
  const W = 320, H = 132, top = 12, max = today * steps || 1;
  const pts = (v: number) => Array.from({ length: steps + 1 }, (_, s) => [(s / steps) * W, H - ((v * s) / max) * (H - top)] as const);
  const d = (p: readonly (readonly [number, number])[]) => p.map(([x, y], j) => `${j ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const A = pts(today), B = pts(after);
  return { today: d(A), after: d(B), gap: d([...A, ...B.slice().reverse()]) + "Z", endToday: A[steps], endAfter: B[steps] };
}

/** Ring split: share of savings that is time vs margin, as a stroke-dasharray for r=34. */
export const RING = 2 * Math.PI * 34;
export const ringDash = (timeValue: number, total: number) => {
  const t = total > 0 ? timeValue / total : 0;
  return `${(t * RING).toFixed(1)} ${RING.toFixed(1)}`;
};

export function mount(root: HTMLElement): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cfg = root.querySelector<HTMLElement>("[data-calc-cfg]");
  const a: Assumptions = { timePct: Number(cfg?.dataset.time) || 60, leakPct: Number(cfg?.dataset.leak) || 50, hourly: Number(cfg?.dataset.hourly) || 600 };
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>("input[type=range]"));
  const presetBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-preset]"));
  const periodBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-period]"));
  const customBox = root.querySelector<HTMLElement>("[data-custom]");
  const customN = root.querySelector<HTMLInputElement>("[data-custom-n]");
  const customU = root.querySelector<HTMLSelectElement>("[data-custom-u]");
  const customMonths = () => span(Number(customN?.value), customU?.value === "years" ? "years" : "months");
  const q = (k: string) => root.querySelector<HTMLElement>(`[data-out="${k}"]`);
  const svg = (k: string) => root.querySelector<SVGElement>(`[data-svg="${k}"]`);
  let period: Period = "year";
  let raf = 0;

  // numbers count from what is shown to the new value
  const shown = new Map<string, number>();
  const tweens = new Map<string, number>();
  const countTo = (key: string, to: number, fmt: (n: number) => string) => {
    const el = q(key); if (!el) return;
    const from = shown.get(key) ?? to;
    shown.set(key, to);
    cancelAnimationFrame(tweens.get(key) || 0);
    if (reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 520;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) tweens.set(key, requestAnimationFrame(step));
    };
    tweens.set(key, requestAnimationFrame(step));
  };

  const values = () => Object.fromEntries(inputs.map((el) => [el.name, Number(el.value)])) as Inputs;

  const update = () => {
    raf = 0;
    const v = values();
    inputs.forEach((el) => {
      const s = SLIDERS.find((x) => x.key === el.name)!;
      const o = q("v-" + el.name); if (o) o.textContent = s.fmt(Number(el.value));
      el.style.setProperty("--fill", `${((Number(el.value) - s.min) / (s.max - s.min)) * 100}%`);
      el.setAttribute("aria-valuetext", s.fmt(Number(el.value)));
    });
    const preset = PERIODS.find((p) => p.id === period);
    const months = preset ? preset.months : customMonths();
    const r = compute(v, a, months);
    const lead = q("lead"); if (lead) lead.textContent = preset ? preset.lead : `You could get back over ${spanLabel(months)}`;
    countTo("total", r.total, inr);
    countTo("hours", r.hoursBack, (n) => `${Math.round(n).toLocaleString("en-IN")} hrs`);
    countTo("timeValue", r.timeValue, inr);
    countTo("margin", r.marginBack, inr);
    countTo("pct", r.pctOfTurnover, (n) => `${n.toFixed(1)}%`);
    countTo("costToday", r.costToday, inr);
    countTo("costAfter", r.costAfter, inr);
    // chart: weekly points for a month, monthly up to 5 years, then quarterly so the line stays smooth
    const steps = months === 1 ? 4 : months <= 60 ? months : Math.ceil(months / 3);
    const c = chart(r.costToday / steps, r.costAfter / steps, steps);
    svg("today")?.setAttribute("d", c.today);
    svg("after")?.setAttribute("d", c.after);
    svg("gap")?.setAttribute("d", c.gap);
    svg("dotToday")?.setAttribute("cy", c.endToday[1].toFixed(1));
    svg("dotAfter")?.setAttribute("cy", c.endAfter[1].toFixed(1));
    const ax = q("axis"); if (ax) ax.textContent = months === 1 ? "4 weeks" : spanLabel(months);
    svg("ring")?.setAttribute("stroke-dasharray", ringDash(r.timeValue, r.total));
    // which preset (if any) matches the sliders
    const match = PRESETS.find((p) => (Object.keys(p.v) as (keyof Inputs)[]).every((k) => p.v[k] === v[k]));
    presetBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.preset === (match?.id ?? "custom"))));
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(update); };

  inputs.forEach((el) => el.addEventListener("input", kick));
  presetBtns.forEach((b) => b.addEventListener("click", () => {
    const p = PRESETS.find((x) => x.id === b.dataset.preset); if (!p) return;
    inputs.forEach((el) => { el.value = String(p.v[el.name as keyof Inputs]); });
    kick();
  }));
  periodBtns.forEach((b) => b.addEventListener("click", () => {
    period = b.dataset.period as Period;
    periodBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (customBox) customBox.hidden = period !== "custom";
    if (period === "custom") customN?.focus();
    kick();
  }));
  customN?.addEventListener("input", kick);
  customU?.addEventListener("change", () => {
    // keep the same length when switching unit, e.g. 2 years ↔ 24 months
    const m = span(Number(customN?.value), customU.value === "years" ? "months" : "years");
    if (customN) customN.value = String(customU.value === "years" ? +(m / 12).toFixed(1) : m);
    kick();
  });
  update();
  return () => {
    cancelAnimationFrame(raf); tweens.forEach((t) => cancelAnimationFrame(t));
    inputs.forEach((el) => el.removeEventListener("input", kick));
  };
}
