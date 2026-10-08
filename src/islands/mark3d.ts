/**
 * 3D SK mark: the real artwork stacked in thin layers for a smooth, solid, sharp thickness. It sways
 * gently so the depth shows and leans toward the pointer; all motion is eased so it flows. Pure CSS 3D
 * driven by a small rAF loop that stops off screen; static for reduced motion.
 */
export function mount(root: HTMLElement): () => void {
  const rot = root.querySelector<HTMLElement>(".mk-rot");
  if (!rot || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  let mx = 0, my = 0, smx = 0, smy = 0, rx = 0, ry = 0, raf = 0, visible = true, last = performance.now();
  const t0 = performance.now();

  const frame = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = (rate: number) => 1 - Math.exp(-dt * rate);
    smx += (mx - smx) * k(4); smy += (my - smy) * k(4);
    const ty = Math.sin(t * 0.55) * 22 + smx * 18;
    const tx = Math.sin(t * 0.37) * 6 - smy * 12;
    ry += (ty - ry) * k(4); rx += (tx - rx) * k(4);
    rot.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    rot.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    // light follows the turn: the face brightens as it faces you
    root.style.setProperty("--lit", (0.92 + 0.12 * Math.cos((ry * Math.PI) / 180) - Math.abs(ry) / 400).toFixed(3));
    raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const onMove = (e: PointerEvent) => {
    const b = root.getBoundingClientRect();
    mx = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / (innerWidth / 2)));
    my = Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / (innerHeight / 2)));
  };
  if (fine) addEventListener("pointermove", onMove, { passive: true });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  io.observe(root);
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener("visibilitychange", onVis);
  kick();
  return () => {
    cancelAnimationFrame(raf); io.disconnect();
    removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis);
  };
}
