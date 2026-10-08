/** Crosses out the tools Shellkore replaces, once, when the list scrolls into view. */
export function mount(root: HTMLElement): () => void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { root.classList.add("in"); return () => {}; }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { root.classList.add("in"); io.disconnect(); } }, { threshold: 0.35 });
  io.observe(root);
  return () => io.disconnect();
}
