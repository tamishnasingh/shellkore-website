/**
 * Free tools: BOQ estimator, tiles, paint, home-loan EMI. The server already rendered correct numbers;
 * this makes every input live, counts the headline figure to its new value and switches tabs.
 */
import { boq, tiles, paint, emi, rupees, TYPES, type ProjectType, type Finish, type City } from "@/lib/tools";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function mount(root: HTMLElement): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T & HTMLElement>(s);
  const out = (k: string) => root.querySelector<HTMLElement>(`[data-o="${k}"]`);
  const num = (name: string) => Number(root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value) || 0;
  const offs: (() => void)[] = [];
  const on = (el: EventTarget | null, ev: string, fn: EventListener) => { if (!el) return; el.addEventListener(ev, fn); offs.push(() => el.removeEventListener(ev, fn)); };

  /* count the big number to its new value */
  const shown = new Map<HTMLElement, number>(), anim = new Map<HTMLElement, number>();
  const countTo = (el: HTMLElement | null, to: number, fmt: (n: number) => string) => {
    if (!el) return;
    const from = shown.get(el) ?? to; shown.set(el, to);
    cancelAnimationFrame(anim.get(el) || 0);
    if (reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 480), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) anim.set(el, requestAnimationFrame(step));
    };
    anim.set(el, requestAnimationFrame(step));
  };

  /* ---------- tabs ---------- */
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-tab]"));
  const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-panel]"));
  const select = (id: string, focus = false) => {
    tabs.forEach((t) => { const onT = t.dataset.tab === id; t.setAttribute("aria-selected", String(onT)); t.tabIndex = onT ? 0 : -1; if (onT && focus) t.focus(); });
    panels.forEach((p) => (p.hidden = p.dataset.panel !== id));
  };
  tabs.forEach((t, i) => {
    t.tabIndex = i === 0 ? 0 : -1;
    on(t, "click", () => select(t.dataset.tab!));
    on(t, "keydown", (e) => {
      const k = (e as KeyboardEvent).key; if (k !== "ArrowRight" && k !== "ArrowLeft") return;
      const n = tabs[(i + (k === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; select(n.dataset.tab!, true);
    });
  });
  root.querySelectorAll("form").forEach((f) => on(f, "submit", (e) => e.preventDefault()));

  /* ---------- BOQ ---------- */
  const state = { type: "build" as ProjectType, finish: "premium" as Finish, city: "metro" as City, area: 2000 };
  const range = $<HTMLInputElement>('[name="area"]'), areaN = $<HTMLInputElement>('[name="areaN"]'), city = $<HTMLSelectElement>('[name="city"]');
  const drawBoq = () => {
    const r = boq(state);
    countTo(out("total"), r.total, rupees);
    const rate = `₹${r.perSqft.toLocaleString("en-IN")}/sq ft`;
    out("range")!.textContent = `${rupees(r.low)} – ${rupees(r.high)} · ${rate}`;
    out("weeks")!.textContent = `${r.weeks} weeks`;
    out("heads")!.textContent = String(r.lines.length);
    out("rate")!.textContent = rate;
    out("areaHint")!.textContent = TYPES.find((t) => t.id === state.type)!.hint;
    const max = Math.max(...r.lines.map((l) => l.share));
    out("lines")!.innerHTML = r.lines.map((l) => `<li><span>${esc(l.name)}</span><i style="--w:${((l.share / max) * 100).toFixed(1)}%"></i><b>${rupees(l.amount)}</b></li>`).join("");
    out("milestones")!.innerHTML = r.milestones.map((m, i) => `<span style="--s:${m.share};--i:${i}"><b>${m.share}%</b><small>${esc(m.name)}</small></span>`).join("");
    out("matTitle")!.textContent = state.type === "build" || state.type === "renovation" ? "Key materials (thumb rule)" : "Key materials";
    out("materials")!.innerHTML = r.materials.map((m) => `<span><small>${esc(m.name)}</small><b>${esc(m.qty)}</b></span>`).join("");
    if (range) range.style.setProperty("--fill", `${((Math.min(10000, state.area) - 300) / 9700) * 100}%`);
  };
  root.querySelectorAll<HTMLButtonElement>("[data-type]").forEach((b, _i, all) => on(b, "click", () => {
    state.type = b.dataset.type as ProjectType; all.forEach((x) => x.setAttribute("aria-pressed", String(x === b))); drawBoq();
  }));
  root.querySelectorAll<HTMLButtonElement>("[data-finish]").forEach((b, _i, all) => on(b, "click", () => {
    state.finish = b.dataset.finish as Finish; all.forEach((x) => x.setAttribute("aria-pressed", String(x === b))); drawBoq();
  }));
  on(range, "input", () => { state.area = Number(range!.value); if (areaN) areaN.value = range!.value; drawBoq(); });
  on(areaN, "input", () => { const v = Number(areaN!.value); if (v >= 100) { state.area = Math.min(100000, v); if (range) range.value = String(Math.min(10000, Math.max(300, v))); drawBoq(); } });
  on(city, "change", () => { state.city = city!.value as City; drawBoq(); });

  /* ---------- tiles ---------- */
  const drawTiles = () => {
    const t = tiles(num("tl"), num("tw"), root.querySelector<HTMLSelectElement>('[name="ts"]')!.value, num("tx"));
    countTo(out("tCount"), t.count, (n) => Math.round(n).toLocaleString("en-IN"));
    out("tBoxes")!.textContent = `${t.boxes.toLocaleString("en-IN")} boxes · ${t.perBox} per box`;
    out("tArea")!.textContent = `${Math.round(t.area).toLocaleString("en-IN")} sq ft`;
    out("tSkirt")!.textContent = `${t.skirting} rft`;
    out("twv")!.textContent = `${num("tx")}%`;
  };
  ["tl", "tw", "tx"].forEach((n) => on(root.querySelector(`[name="${n}"]`), "input", drawTiles));
  on(root.querySelector('[name="ts"]'), "change", drawTiles);

  /* ---------- paint ---------- */
  const drawPaint = () => {
    const p = paint(num("pl"), num("pw"), num("ph"), num("pd"), num("pn"), num("pc"), !!root.querySelector<HTMLInputElement>('[name="pceil"]')?.checked);
    countTo(out("pPaint"), p.paintL, (n) => `${n.toFixed(1)} L`);
    out("pArea")!.textContent = `${Math.round(p.area).toLocaleString("en-IN")} sq ft to paint`;
    out("pPrimer")!.textContent = `${p.primerL.toFixed(1)} L`;
    out("pPutty")!.textContent = `${p.puttyKg.toFixed(1)} kg`;
  };
  ["pl", "pw", "ph", "pd", "pn"].forEach((n) => on(root.querySelector(`[name="${n}"]`), "input", drawPaint));
  on(root.querySelector('[name="pc"]'), "change", drawPaint);
  on(root.querySelector('[name="pceil"]'), "change", drawPaint);

  /* ---------- EMI ---------- */
  const drawEmi = () => {
    const P = num("ea"), R = num("er"), Y = num("ey");
    const e = emi(P, R, Y);
    countTo(out("eEmi"), e.emi, rupees);
    out("eTot")!.textContent = `${rupees(e.total)} paid in all`;
    out("eAmt")!.textContent = rupees(P);
    out("eRate")!.textContent = `${R.toFixed(2).replace(/\.?0+$/, "")}%`;
    out("eYrs")!.textContent = `${Y} year${Y === 1 ? "" : "s"}`;
    out("eP")!.textContent = rupees(P);
    out("eI")!.textContent = rupees(e.interest);
    out("eRing")?.setAttribute("stroke-dasharray", `${((P / e.total) * 100).toFixed(1)} 100`);
  };
  ["ea", "er", "ey"].forEach((n) => on(root.querySelector(`[name="${n}"]`), "input", drawEmi));

  // slider fill for every range input
  const fill = (el: HTMLInputElement) => el.style.setProperty("--fill", `${((Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min))) * 100}%`);
  root.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((el) => { fill(el); on(el, "input", () => fill(el)); });

  drawBoq();
  return () => { offs.forEach((f) => f()); anim.forEach((a) => cancelAnimationFrame(a)); };
}
