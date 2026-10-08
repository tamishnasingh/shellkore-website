/** Fades in below-the-fold `.rv` elements once. Content is visible without JS and with reduced motion. */
export function mount(root: HTMLElement): () => void {
  document.documentElement.classList.add("js");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return () => {};
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
  const els = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
  els.forEach((el) => { if (el.getBoundingClientRect().top > innerHeight * 0.92) { el.classList.add("pre"); io.observe(el); } });
  const t = window.setTimeout(() => els.forEach((el) => el.classList.remove("pre")), 6000);
  return () => { io.disconnect(); clearTimeout(t); };
}
