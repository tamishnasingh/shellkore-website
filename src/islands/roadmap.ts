/**
 * 3D construction roadmap: a pinned stage that builds a tower as you scroll, one phase per screen.
 * This module owns the scroll mapping, the words, the roadmap rail, the HUD and the callout. The WebGL
 * scene (roadmap-scene.ts, with three.js) is fetched only when the section comes near, renders only
 * when something changes, and falls back to a still image if WebGL is unavailable.
 */
import type { Scene } from "./roadmap-scene";

const PHASES = 7;
// piecewise-linear HUD values along the build (P → value)
const DAY: [number, number][] = [[0, 0], [1, 14], [2, 30], [3, 90], [4, 300], [5, 390], [6, 480], [7, 540]];
const PCT: [number, number][] = [[0, 0], [1, 1], [2, 4], [3, 12], [4, 55], [5, 72], [6, 92], [7, 100]];
const SPENT: [number, number][] = [[0, 0], [1, 0.05], [2, 0.3], [3, 2.6], [4, 8.9], [5, 11.2], [6, 13.6], [7, 14.4]];
const at = (tab: [number, number][], P: number) => {
  if (P <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (P <= tab[i][0]) { const [a, va] = tab[i - 1], [b, vb] = tab[i]; return va + ((P - a) / (b - a)) * (vb - va); }
  return tab[tab.length - 1][1];
};

export function mount(root: HTMLElement): () => void {
  const stage = root.querySelector<HTMLElement>(".rm-stage")!;
  const canvas = root.querySelector<HTMLCanvasElement>(".rm-canvas")!;
  const phases = Array.from(root.querySelectorAll<HTMLElement>(".rm-ph"));
  const rail = Array.from(root.querySelectorAll<HTMLElement>(".rm-rail li"));
  const callout = root.querySelector<HTMLElement>(".rm-callout");
  const calloutText = callout?.querySelector<HTMLElement>("span");
  const hud = (k: string) => root.querySelector<HTMLElement>(`[data-hud="${k}"]`);
  const hDay = hud("day"), hPct = hud("pct"), hSpent = hud("spent"), hBar = hud("bar");
  const counter = root.querySelector<HTMLElement>("[data-rm-n]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mobile = innerWidth < 900 || !fine;

  let target = 0, P = 0, px = 0, py = 0, tpx = 0, tpy = 0;
  let raf = 0, last = 0, active = -1, visible = false, dead = false;
  let scene: Scene | null = null, sceneW = 0, sceneH = 0;
  const frameTimes: number[] = [];
  let lastAdapt = 0, steppedDown = false;
  const railEl = root.querySelector<HTMLElement>(".rm-rail");
  const hudLast = { day: "", pct: "", spent: "", bar: "", rail: "" };

  const measure = () => {
    const r = root.getBoundingClientRect();
    const total = r.height - innerHeight;
    const f = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    const t = Math.min(1, f / 0.94) * PHASES;
    if (t !== target) root.removeAttribute("data-settled");
    target = t;
  };

  const setPhase = (i: number) => {
    if (i === active) return;
    active = i;
    phases.forEach((el, j) => { el.classList.toggle("on", j === i); el.classList.toggle("past", j < i); el.setAttribute("aria-hidden", String(j !== i)); });
    rail.forEach((el, j) => { el.classList.toggle("on", j === i); el.classList.toggle("done", j < i); });
    if (counter) counter.textContent = String(i + 1).padStart(2, "0");
    fit();
    if (callout && calloutText) { callout.classList.remove("show"); calloutText.textContent = phases[i]?.dataset.callout || ""; }
  };

  // the card takes the height of the phase it shows, easing between them
  const stack = root.querySelector<HTMLElement>(".rm-stack");
  const fit = () => { const el = phases[active]; if (stack && el) stack.style.height = `${el.offsetHeight}px`; };

  // only touch the DOM when a value actually changes, and never on an ancestor (no subtree style recalcs)
  const paintHud = () => {
    const day = `Day ${Math.round(at(DAY, P))}`, pct = `${Math.round(at(PCT, P))}%`, spent = `₹${at(SPENT, P).toFixed(1)} Cr`;
    const bar = `scaleX(${(at(PCT, P) / 100).toFixed(3)})`, rail = (P / PHASES).toFixed(3);
    if (hDay && day !== hudLast.day) hDay.textContent = hudLast.day = day;
    if (hPct && pct !== hudLast.pct) hPct.textContent = hudLast.pct = pct;
    if (hSpent && spent !== hudLast.spent) hSpent.textContent = hudLast.spent = spent;
    if (hBar && bar !== hudLast.bar) hBar.style.transform = hudLast.bar = bar;
    if (railEl && rail !== hudLast.rail) railEl.style.setProperty("--rm-p", hudLast.rail = rail);
    root.classList.toggle("rm-started", P > 0.12);
  };

  const placeCallout = () => {
    if (!callout || !scene) return;
    const a = scene.anchor(active, P);
    // show only once the camera has settled into this phase
    const settled = Math.abs(target - P) < 0.08 && P - active > 0.2;
    if (!a || a.x < 8 || a.y < 76 || a.x > sceneW - 8 || a.y > sceneH - 8) { callout.classList.remove("show"); return; }
    callout.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
    callout.classList.toggle("flip", a.x > sceneW * 0.62);
    callout.classList.toggle("below", a.y < 150);
    callout.classList.toggle("show", settled);
  };

  const frame = (now: number) => {
    raf = 0;
    if (dead) return;
    // layout is read here, at the start of a frame when it is already clean, never in the scroll handler
    // (reading it there, after last frame's writes, forces a synchronous layout on every scroll event)
    measure();
    const dt = Math.min(0.05, (now - (last || now)) / 1000 || 0.016);
    if (last) { frameTimes.push(now - last); if (frameTimes.length > 40) frameTimes.shift(); }
    last = now;
    const kk = 1 - Math.exp(-dt * (reduce ? 14 : 7.5));
    P += (target - P) * kk;
    if (Math.abs(target - P) < 0.0004) P = target;
    const kp = 1 - Math.exp(-dt * 4);
    px += (tpx - px) * kp; py += (tpy - py) * kp;
    setPhase(Math.min(PHASES - 1, Math.floor(target)));
    paintHud();
    if (scene && visible) { scene.update(P, px, py); scene.render(); placeCallout(); adapt(now); }
    const moving = P !== target || Math.abs(tpx - px) > 0.001 || Math.abs(tpy - py) > 0.001;
    root.toggleAttribute("data-settled", !moving);
    if (moving && visible) raf = requestAnimationFrame(frame);
    else { last = 0; frameTimes.length = 0; if (scene && visible) { maybeUpgrade(); scene.render(true); placeCallout(); } }
  };
  const kick = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };

  // Keep 60 fps: step quality down when the GPU (or, where it can't be timed, the frame rate) is over budget.
  // Medians only, so one slow frame never triggers a change. Steps are remembered for this device.
  const adapt = (now: number) => {
    if (!scene || now - lastAdapt < 700) return;
    const gpu = scene.gpuMs();
    let slow = false;
    if (gpu >= 0) slow = gpu > 10.5;
    else if (frameTimes.length >= 20) { const s2 = frameTimes.slice().sort((a, b) => a - b); slow = s2[s2.length >> 1] > 19; }
    if (!slow) return;
    lastAdapt = now; frameTimes.length = 0; scene.resetGpu();
    if (scene.setTier(scene.tier + 1)) steppedDown = true;
  };
  // When the scroll settles with lots of GPU headroom, step back up (invisible: nothing is moving)
  const maybeUpgrade = () => {
    if (!scene || scene.tier === 0 || (steppedDown && performance.now() - lastAdapt < 8000)) return;
    const gpu = scene.gpuMs();
    if (gpu >= 0 && gpu < 4.5) { scene.resetGpu(); scene.setTier(scene.tier - 1); lastAdapt = performance.now(); }
  };

  const size = () => {
    const b = canvas.getBoundingClientRect();
    sceneW = Math.round(b.width); sceneH = Math.round(b.height);
    if (scene) { scene.resize(sceneW, sceneH, scene.dpr); scene.update(P, px, py); scene.render(); placeCallout(); }
  };
  const ro = new ResizeObserver(size);
  ro.observe(canvas);

  // the 3D is loaded only when the section approaches
  let loading = false;
  const load = async () => {
    if (loading) return; loading = true;
    try {
      const tex = JSON.parse(root.dataset.tex || "{}");
      const { createScene } = await import("./roadmap-scene");
      if (dead) return;
      const s = await createScene(canvas, { tex, mobile, reduce });
      if (dead) { s.dispose(); return; }
      scene = s; size();
      scene.update(P, px, py); scene.render();
      requestAnimationFrame(() => root.classList.add("rm-ready"));
      kick();
    } catch (e) {
      root.classList.add("rm-no3d");
      // without WebGL, show the finished tower instead of the empty plot
      const img = root.querySelector<HTMLImageElement>(".rm-poster");
      if (img?.dataset.end) img.src = img.dataset.end;
      console.warn("roadmap: 3D unavailable", e);
    }
  };
  const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { load(); near.disconnect(); } }, { rootMargin: "150% 0px" });
  near.observe(root);
  // Building the scene is main-thread work; done while the reader is scrolling toward it, it shows as hitches.
  // On desktop, build it ahead of time once the page has gone quiet (the near-observer remains the fallback).
  let early = 0;
  if (!mobile) {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    early = window.setTimeout(() => { if (ric) ric(() => load(), { timeout: 4000 }); else load(); }, 3000);
  }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  io.observe(stage);

  const onMove = (e: PointerEvent) => {
    if (reduce) return;
    tpx = (e.clientX / innerWidth) * 2 - 1; tpy = (e.clientY / innerHeight) * 2 - 1;
    if (!raf && visible) raf = requestAnimationFrame(frame);
  };
  if (fine) stage.addEventListener("pointermove", onMove, { passive: true });

  // the rail jumps straight to a phase
  const onRail = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-go]"); if (!b) return;
    const i = Number(b.dataset.go);
    const r = root.getBoundingClientRect(), total = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + ((i + 0.55) / PHASES) * 0.94 * total, behavior: reduce ? "auto" : "smooth" });
  };
  root.addEventListener("click", onRail);

  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);
  addEventListener("resize", fit);
  measure(); P = target; setPhase(Math.min(PHASES - 1, Math.floor(target))); paintHud();

  return () => {
    dead = true; cancelAnimationFrame(raf); clearTimeout(early); ro.disconnect(); near.disconnect(); io.disconnect();
    removeEventListener("scroll", kick); removeEventListener("resize", kick); removeEventListener("resize", fit);
    stage.removeEventListener("pointermove", onMove); root.removeEventListener("click", onRail);
    scene?.dispose();
  };
}
