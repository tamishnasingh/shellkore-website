/**
 * Hero stage: the app window settles from a slight tilt as you scroll, the floating cards drift at
 * different depths (scroll + pointer parallax), and the WhatsApp card plays its approval on a loop.
 * One rAF loop that sleeps when nothing changes; pauses off screen.
 */
export function mount(root: HTMLElement): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = root.querySelector<HTMLElement>(".stage3d");
  const maxTilt = matchMedia("(max-width: 760px)").matches ? 14 : 24;
  const floats = Array.from(root.querySelectorAll<HTMLElement>(".float"));
  const approve = root.querySelector<HTMLElement>("[data-approve]");
  const reply = root.querySelector<HTMLElement>("[data-reply]");
  const timers: number[] = [];
  let visible = true;

  // WhatsApp approval loop
  const loop = () => {
    if (!approve || !reply) return;
    approve.classList.remove("press"); reply.classList.remove("show");
    timers.push(window.setTimeout(() => visible && approve.classList.add("press"), 2600));
    timers.push(window.setTimeout(() => visible && reply.classList.add("show"), 3100));
    timers.push(window.setTimeout(loop, 7600));
  };
  if (reduce) { approve?.classList.add("press"); reply?.classList.add("show"); }
  else timers.push(window.setTimeout(loop, 1600));

  if (reduce) return () => timers.forEach(clearTimeout);

  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  let sy = 0, mx = 0, my = 0, cx = 0, cy = 0, raf = 0;
  const frame = () => {
    raf = 0;
    if (!visible) return;
    cx += (mx - cx) * 0.08; cy += (my - cy) * 0.08;
    const r = root.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.92 - r.top) / (innerHeight * 0.75)));
    if (scene) {
      // tilted back at rest, flat by the time the window is fully in view; pointer turns it slightly
      const k = 1 - p, e = k * k * (3 - 2 * k);
      scene.style.setProperty("--rx", `${(maxTilt * e - cy * 5).toFixed(2)}deg`);
      scene.style.setProperty("--ry", `${(cx * 7).toFixed(2)}deg`);
      scene.style.setProperty("--rz", `${(-2.5 * e).toFixed(2)}deg`);
      root.style.setProperty("--flat", (1 - e).toFixed(3));
    }
    const scrollPast = Math.max(0, -r.top);
    floats.forEach((f) => {
      const d = parseFloat(f.dataset.depth || "1");
      f.style.setProperty("--px", `${(cx * d * 6).toFixed(1)}px`);
      f.style.setProperty("--py", `${(cy * d * 5 - scrollPast * (d - 1) * 0.09).toFixed(1)}px`);
    });
    sy = scrollY;
    if (Math.abs(mx - cx) > 0.002 || Math.abs(my - cy) > 0.002) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const onScroll = () => kick();
  const onMove = (e: PointerEvent) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; kick(); };
  addEventListener("scroll", onScroll, { passive: true });
  if (fine) addEventListener("pointermove", onMove, { passive: true });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  io.observe(root);
  kick();
  void sy;
  return () => {
    timers.forEach(clearTimeout); cancelAnimationFrame(raf); io.disconnect();
    removeEventListener("scroll", onScroll); removeEventListener("pointermove", onMove);
  };
}
