/**
 * Hero skyline (motion graphics): the drawing itself animates in CSS. This island only adds a gentle,
 * eased scroll parallax so the skyline sinks and fades as the page moves, and pauses the looping
 * animations when the hero is off screen.
 */
export function mount(root: HTMLElement): () => void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const hero = root.closest("section") || root;
  let target = 0, p = 0, raf = 0;
  const frame = () => {
    raf = 0;
    p += (target - p) * 0.12;
    if (Math.abs(target - p) < 0.001) p = target;
    // written straight to transform/opacity: nothing inside the drawing is re-styled
    root.style.transform = `translate3d(0,${(p * 60).toFixed(1)}px,0)`;
    root.style.opacity = (1 - p * 0.7).toFixed(3);
    if (p !== target) raf = requestAnimationFrame(frame);
  };
  const onScroll = () => {
    target = Math.min(1, Math.max(0, scrollY / ((hero.getBoundingClientRect().height || 900) * 0.6)));
    if (!raf) raf = requestAnimationFrame(frame);
  };
  addEventListener("scroll", onScroll, { passive: true });
  const io = new IntersectionObserver(([e]) => root.classList.toggle("paused", !e.isIntersecting));
  io.observe(root);
  onScroll();
  return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener("scroll", onScroll); };
}
