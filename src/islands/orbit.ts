/**
 * Ecosystem diagram. One clock drives both the black segment on the ring and the active step: the
 * segment travels round the ring without stopping, and each step lights up (and the centre text
 * changes) the instant the segment reaches it. Pointing at a step sends the segment straight to it,
 * the short way round; moving away lets it carry on from there.
 */
export function mount(root: HTMLElement): () => void {
  const text = root.querySelector<HTMLElement>("[data-core-text]");
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".node:not(.soon)"));
  const flow = root.querySelector<SVGPathElement>(".flow");
  if (!text || !nodes.length) return () => {};
  const base = text.textContent || "";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const N = nodes.length;

  // the ring path is normalised to N * 100 units, so step k sits at k * 100 along it
  const SEG = 100, PL = N * SEG, DASH = 20;
  if (flow) {
    flow.setAttribute("pathLength", String(PL));
    flow.style.animation = "none";
  }
  // draw the segment with its head exactly at position u (in steps); it stretches a little while moving
  const draw = (u: number, stretch = 0) => {
    if (!flow) return;
    const len = DASH + stretch;
    flow.style.strokeDasharray = `${len.toFixed(2)} ${(PL - len).toFixed(2)}`;
    flow.style.strokeDashoffset = (len - u * SEG).toFixed(2);
  };

  let cur = 0;          // the step the segment is at (or heading to)
  let head = 0;         // where the segment's head is drawn, in steps
  let active = -1, held = false, visible = false, dead = false;
  let raf = 0, dwell = 0;

  const light = (k: number) => {
    if (k === active) return;
    active = k;
    nodes.forEach((x, j) => x.classList.toggle("on", j === k));
    text.style.opacity = "0";
    window.setTimeout(() => { if (active === k) { text.textContent = nodes[k].dataset.desc || base; text.style.opacity = "1"; } }, 150);
  };

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** Glide from the current head to step k (short way round when `shortest`), then light it up. */
  const travel = (k: number, shortest: boolean, then?: () => void) => {
    cancelAnimationFrame(raf); clearTimeout(dwell);
    let d = (((k - head) % N) + N) % N;           // clockwise distance in steps
    if (shortest && d > N / 2) d -= N;            // or anticlockwise if that's shorter
    if (Math.abs(d) < 1e-3 || reduce) { head = k; cur = k; draw(head); light(k); then?.(); return; }
    const from = head, dur = 520 + 260 * Math.min(3, Math.abs(d));
    const t0 = performance.now();
    cur = k;
    const step = (now: number) => {
      if (dead) return;
      const t = Math.min(1, (now - t0) / dur), e = ease(t);
      head = from + d * e;
      draw(head, 26 * Math.sin(Math.PI * e)); // a short comet tail while it moves
      if (t < 1) { raf = requestAnimationFrame(step); return; }
      head = ((k % N) + N) % N;
      draw(head);
      light(k);                                  // the step lights up exactly on arrival
      then?.();
    };
    raf = requestAnimationFrame(step);
  };

  /** Continuous motion: the segment keeps travelling round the ring at a steady pace, and each step
   *  lights up the instant the segment reaches it. */
  const STEP_MS = 1700;
  let last = 0;
  const run = (now: number) => {
    raf = 0;
    if (dead || held || !visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    head = (head + dt / STEP_MS) % N;
    draw(head);
    const k = Math.floor(head + 1e-6) % N;
    if (k !== active) { cur = k; light(k); }
    raf = requestAnimationFrame(run);
  };
  const loop = () => {
    if (reduce) return;
    if (!raf && !held && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(run); }
  };

  nodes.forEach((n, k) => {
    const on = () => { held = true; cancelAnimationFrame(raf); raf = 0; travel(k, true); };
    const off = () => { held = false; cancelAnimationFrame(raf); raf = 0; loop(); };
    n.addEventListener("pointerenter", on); n.addEventListener("focus", on);
    n.addEventListener("pointerleave", off); n.addEventListener("blur", off);
  });

  draw(0);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { if (active < 0) light(0); loop(); }
    else { clearTimeout(dwell); cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(root);
  const onVis = () => { if (!document.hidden) loop(); };
  document.addEventListener("visibilitychange", onVis);

  return () => { dead = true; cancelAnimationFrame(raf); clearTimeout(dwell); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
}
