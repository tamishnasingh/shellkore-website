/**
 * Full-bleed 3D hero: the finished tower at golden hour. A scan line sweeps up and down it; below the
 * line the building is real, above it Shellkore's digital twin. Three live cards are pinned to the tower.
 *
 * Shares the WebGL engine with the roadmap (one download). A still frame shows until the first render;
 * the loop runs only while the hero is on screen and the tab is visible, and trims resolution if the
 * device can't keep up.
 */
import type { Scene } from "./roadmap-scene";

export function mount(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>(".h3-canvas");
  if (!canvas) return () => {};
  const pins = Array.from(root.querySelectorAll<HTMLElement>("[data-pin]"));
  const levelEl = root.querySelector<HTMLElement>("[data-h3-level]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mobile = innerWidth < 900 || !fine;

  let scene: Scene | null = null, raf = 0, dead = false, visible = true, w = 0, h = 0;
  let px = 0, py = 0, tpx = 0, tpy = 0, last = 0, t = 4.2;
  const devDpr = devicePixelRatio || 1;
  let dpr = devDpr >= 1.75 ? 1.5 : Math.min(devDpr, 1.25);
  const times: number[] = [];

  const frame = (now: number) => {
    raf = 0;
    if (dead || !scene) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    if (last) { times.push(now - last); if (times.length > 45) times.shift(); }
    last = now;
    if (!reduce) t += dt;
    const k = 1 - Math.exp(-dt * 3);
    px += (tpx - px) * k; py += (tpy - py) * k;
    const r = scene.hero(t, px, py);
    r.pins.forEach((p, i) => {
      const el = pins[i]; if (!el) return;
      const minY = w < 900 ? h * 0.56 : 70; // on phones, keep cards below the words
      if (!p || p.y < minY || p.y > h - 20 || p.x < 10 || p.x > w - 10) { el.classList.remove("show"); return; }
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      el.classList.toggle("flip", p.x > w - 250);
      el.classList.add("show");
    });
    if (levelEl) levelEl.textContent = r.level >= 9 ? "Roof" : `Level ${r.level}`;
    // keep the frame rate up: trim resolution on slower devices
    if (times.length >= 45 && dpr > (mobile ? 1 : 0.75)) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      if (avg > 19) { dpr = Math.max(mobile ? 1 : 0.75, dpr - 0.25); times.length = 0; scene.resize(w, h, dpr); }
    }
    if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = () => { if (!raf && scene && !dead) raf = requestAnimationFrame(frame); };

  const size = () => {
    const b = canvas.getBoundingClientRect();
    w = Math.round(b.width); h = Math.round(b.height);
    if (scene) { scene.resize(w, h, dpr); kick(); }
  };
  const ro = new ResizeObserver(size); ro.observe(canvas);

  (async () => {
    try {
      const tex = JSON.parse(root.dataset.tex || "{}");
      const { createScene } = await import("./roadmap-scene");
      if (dead) return;
      const s = await createScene(canvas, { tex, mobile, reduce, mode: "hero" });
      if (dead) { s.dispose(); return; }
      scene = s; size();
      scene.update(7, 0, 0);
      scene.hero(t, 0, 0);
      requestAnimationFrame(() => root.classList.add("h3-ready"));
      kick();
    } catch (e) {
      root.classList.add("h3-no3d");
      console.warn("hero: 3D unavailable", e);
    }
  })();

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  io.observe(root);
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener("visibilitychange", onVis);
  const onMove = (e: PointerEvent) => { tpx = (e.clientX / innerWidth) * 2 - 1; tpy = (e.clientY / innerHeight) * 2 - 1; };
  if (fine && !reduce) addEventListener("pointermove", onMove, { passive: true });

  return () => {
    dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    document.removeEventListener("visibilitychange", onVis); removeEventListener("pointermove", onMove);
    scene?.dispose();
  };
}
