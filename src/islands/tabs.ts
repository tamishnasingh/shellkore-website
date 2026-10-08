/** Shared tab behaviour: click, arrow keys, and an auto-advance that stops once the visitor takes over. */
export function tabs(opts: { tabs: HTMLElement[]; onSelect: (i: number) => void; bars: HTMLElement[]; ms: number; root: HTMLElement }): () => void {
  const { tabs: list, onSelect, bars, ms, root } = opts;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cur = 0, auto = !reduce, visible = false, held = false, timer = 0;
  const select = (i: number, user: boolean) => {
    cur = i;
    list.forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    onSelect(i);
    if (user) auto = false;
    arm();
  };
  const arm = () => {
    clearTimeout(timer);
    bars.forEach((b) => { b.classList.remove("run"); b.style.width = auto ? "" : "100%"; });
    if (!auto || !visible || held) return;
    const b = bars[cur];
    if (b) { void b.offsetWidth; b.style.setProperty("--dur", `${ms}ms`); b.classList.add("run"); }
    timer = window.setTimeout(() => select((cur + 1) % list.length, false), ms);
  };
  list.forEach((t, i) => {
    t.addEventListener("click", () => select(i, true));
    t.addEventListener("keydown", (e) => {
      const n = ({ ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 } as Record<string, number>)[e.key];
      if (n === undefined) return;
      e.preventDefault();
      const k = (n + list.length) % list.length;
      select(k, true); list[k].focus();
    });
  });
  const enter = () => { held = true; arm(); bars[cur]?.classList.add("paused"); };
  const leave = () => { held = false; arm(); };
  root.addEventListener("pointerenter", enter); root.addEventListener("pointerleave", leave);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; arm(); }, { threshold: 0.35 });
  io.observe(root);
  return () => { clearTimeout(timer); io.disconnect(); root.removeEventListener("pointerenter", enter); root.removeEventListener("pointerleave", leave); };
}
