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
  const times: number[] = [];
  const pinLast: string[] = [];
  let lastAdapt = 0, lastDraw = 0, steppedDown = false, lastScroll = -1e9, lastLevel = "";
  const onScroll = () => { lastScroll = performance.now(); };
  addEventListener("scroll", onScroll, { passive: true });

  const frame = (now: number) => {
    raf = 0;
    if (dead || !scene) return;
    // lightest tier: draw at 30 fps so the hero never competes with page scrolling
    if (scene.tier >= 3 && now - lastDraw < 30) { if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame); return; }
    // While the page is scrolling, hold the frame: the browser's own scrolling gets the whole GPU. The tower
    // only drifts slowly (a ~20 s cycle), so a pause of a few frames can't be seen, while a half-rate stutter can.
    if (now - lastScroll < 140) { last = 0; if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame); return; }
    lastDraw = now;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    // frame times only count when nothing else is throttling the loop (scroll half-rate, tab switches)
    if (last && now - lastScroll > 400 && now - last < 250) { times.push(now - last); if (times.length > 45) times.shift(); }
    last = now;
    if (!reduce) t += dt;
    const k = 1 - Math.exp(-dt * 3);
    px += (tpx - px) * k; py += (tpy - py) * k;
    const r = scene.hero(t, px, py);
    r.pins.forEach((p, i) => {
      const el = pins[i]; if (!el) return;
      const minY = w < 900 ? h * 0.56 : 70; // on phones, keep cards below the words
      if (!p || p.y < minY || p.y > h - 20 || p.x < 10 || p.x > w - 10) { el.classList.remove("show"); return; }
      // write only when the card has actually moved: no style work on frames where nothing changed
      const tf = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      if (tf !== pinLast[i]) el.style.transform = pinLast[i] = tf;
      el.classList.toggle("flip", p.x > w - 250);
      el.classList.add("show");
    });
    const level = r.level >= 9 ? "Roof" : `Level ${r.level}`;
    if (levelEl && level !== lastLevel) levelEl.textContent = lastLevel = level;
    // quality: step down when the GPU is over budget, back up when there's lots of headroom
    if (now - lastAdapt > 1500) {
      const gpu = scene.gpuMs();
      let slow = false, fast = false;
      if (gpu >= 0) { slow = gpu > 10.5; fast = gpu < 4.5; }
      else if (times.length >= 30) { const s2 = times.slice().sort((a, b) => a - b); slow = s2[s2.length >> 1] > 19; }
      if (slow && scene.setTier(scene.tier + 1)) { steppedDown = true; lastAdapt = now; times.length = 0; scene.resetGpu(); }
      else if (fast && scene.tier > 0 && now - lastAdapt > (steppedDown ? 8000 : 1500) && scene.setTier(scene.tier - 1)) { lastAdapt = now; scene.resetGpu(); }
    }
    if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = () => { if (!raf && scene && !dead) raf = requestAnimationFrame(frame); };

  const size = () => {
    const b = canvas.getBoundingClientRect();
    w = Math.round(b.width); h = Math.round(b.height);
    if (scene) { scene.resize(w, h, scene.dpr); kick(); }
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
  const onPalette = () => { if (scene) { scene.setPalette(); scene.update(7, 0, 0); kick(); } };
  addEventListener("sk-palette", onPalette);
  document.addEventListener("visibilitychange", onVis);
  const onMove = (e: PointerEvent) => { tpx = (e.clientX / innerWidth) * 2 - 1; tpy = (e.clientY / innerHeight) * 2 - 1; };
  if (fine && !reduce) addEventListener("pointermove", onMove, { passive: true });

  return () => {
    dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    document.removeEventListener("visibilitychange", onVis); removeEventListener("pointermove", onMove); removeEventListener("scroll", onScroll); removeEventListener("sk-palette", onPalette);
    scene?.dispose();
  };
}
