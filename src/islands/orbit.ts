/** Ecosystem diagram: pointing at a module shows what it does in the centre. Also cycles gently when idle. */
export function mount(root: HTMLElement): () => void {
  const text = root.querySelector<HTMLElement>("[data-core-text]");
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".node:not(.soon)"));
  if (!text || !nodes.length) return () => {};
  const base = text.textContent || "";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = -1, timer = 0, held = false, visible = false;
  const set = (n: number) => {
    nodes.forEach((x, k) => x.classList.toggle("on", k === n));
    text.style.opacity = "0";
    window.setTimeout(() => { text.textContent = n < 0 ? base : (nodes[n].dataset.desc || base); text.style.opacity = "1"; }, 150);
  };
  const tick = () => { if (!held && visible && !document.hidden) { i = (i + 1) % nodes.length; set(i); } };
  nodes.forEach((n, k) => {
    const on = () => { held = true; i = k; set(k); };
    const off = () => { held = false; };
    n.addEventListener("pointerenter", on); n.addEventListener("focus", on);
    n.addEventListener("pointerleave", off); n.addEventListener("blur", off);
  });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(root);
  if (!reduce) timer = window.setInterval(tick, 2600);
  return () => { clearInterval(timer); io.disconnect(); };
}
