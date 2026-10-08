/**
 * 3D SK mark: pre-shaded image slices stacked in depth. The gentle sway is pure CSS animation (runs on the
 * compositor, so it stays smooth even while the page is busy loading). This module only adds an eased lean
 * toward the pointer, written straight to one transform, and the loop sleeps as soon as the lean settles.
 */
export function mount(root: HTMLElement): () => void {
  const tilt = root.querySelector<HTMLElement>(".mk-tilt");
  if (!tilt || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  let mx = 0, my = 0, x = 0, y = 0, raf = 0, last = 0, visible = true;

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    const k = 1 - Math.exp(-dt * 5);
    x += (mx - x) * k; y += (my - y) * k;
    tilt.style.transform = `rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 18).toFixed(2)}deg)`;
    if (Math.abs(mx - x) + Math.abs(my - y) > 0.002) raf = requestAnimationFrame(frame);
  };
  const onMove = (e: PointerEvent) => {
    if (!visible) return;
    const b = root.getBoundingClientRect();
    mx = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / (innerWidth / 2)));
    my = Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / (innerHeight / 2)));
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  addEventListener("pointermove", onMove, { passive: true });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; root.classList.toggle("paused", !visible); });
  io.observe(root);
  return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener("pointermove", onMove); };
}
