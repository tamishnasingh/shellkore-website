/**
 * "Every site, live": one site at a time lights up on the board, a pulse runs down its line into the
 * Shellkore hub, and the matching update is highlighted in the feed. Hover or focus a feed item (or a
 * building) to jump to it. Pauses off screen.
 */
export function mount(root: HTMLElement): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = Array.from(root.querySelectorAll<HTMLElement>("[data-site]"));
  const nodes = Array.from(root.querySelectorAll<SVGGElement>("[data-node]"));
  const lines = Array.from(root.querySelectorAll<SVGGElement>("[data-line]"));
  const labels = Array.from(root.querySelectorAll<SVGTextElement>("[data-label]"));
  const now = root.querySelector<HTMLElement>("[data-now]");
  if (!items.length) return () => {};
  let active = -1, timer = 0, visible = true;

  const show = (i: number) => {
    if (i === active) return;
    active = i;
    items.forEach((el, k) => el.classList.toggle("on", k === i));
    nodes.forEach((el) => el.classList.toggle("on", Number(el.dataset.node) === i));
    labels.forEach((el) => el.classList.toggle("on", Number(el.dataset.label) === i));
    lines.forEach((el) => {
      const on = Number(el.dataset.line) === i;
      el.classList.toggle("on", on);
      if (on) { el.classList.remove("go"); void el.getBoundingClientRect(); el.classList.add("go"); }
    });
    if (now) {
      const src = items[i];
      now.querySelector("[data-now-city]")!.textContent = src.dataset.city || "";
      now.querySelector("[data-now-text]")!.textContent = src.querySelector("b")?.textContent || "";
      now.classList.remove("pop"); void now.offsetWidth; now.classList.add("pop");
    }
  };
  const schedule = () => {
    clearInterval(timer);
    if (!reduce) timer = window.setInterval(() => { if (visible && !document.hidden) show((active + 1) % items.length); }, 3200);
  };
  const pick = (i: number) => () => { show(i); schedule(); };
  const offs: (() => void)[] = [];
  items.forEach((el, i) => {
    const f = pick(i);
    el.addEventListener("mouseenter", f); el.addEventListener("focus", f); el.addEventListener("click", f);
    offs.push(() => { el.removeEventListener("mouseenter", f); el.removeEventListener("focus", f); el.removeEventListener("click", f); });
  });
  nodes.forEach((el) => {
    const f = pick(Number(el.dataset.node));
    el.addEventListener("mouseenter", f);
    offs.push(() => el.removeEventListener("mouseenter", f));
  });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; root.classList.toggle("in", visible); });
  io.observe(root);
  show(0);
  schedule();
  return () => { clearInterval(timer); io.disconnect(); offs.forEach((f) => f()); };
}
