/**
 * "How it works" floor plan. One home plan that, as you scroll through the four steps, goes from a
 * flat blueprint (takeoff) to a tilted model (approvals) to rising 3D walls (the flow) to rooms
 * colour-coded by budget (margin). `draw(P)` returns the SVG markup for a progress value P in [0, 3];
 * the server renders P = 0 so the section reads without JavaScript, and `mount` redraws on scroll.
 */
type Pt = [number, number];
type Room = { id: string; name: string; dims: string; x0: number; y0: number; x1: number; y1: number; budget: "ok" | "watch" | "over" };

export const ROOMS: Room[] = [
  { id: "living", name: "Living room", dims: "21' × 15'", x0: -7, y0: -5, x1: 0, y1: 0, budget: "ok" },
  { id: "kitchen", name: "Kitchen", dims: "12' × 12'", x0: 0, y0: -5, x1: 4, y1: -1, budget: "watch" },
  { id: "utility", name: "Utility", dims: "9' × 12'", x0: 4, y0: -5, x1: 7, y1: -1, budget: "ok" },
  { id: "bed1", name: "Bedroom", dims: "15' × 15'", x0: -7, y0: 0, x1: -2, y1: 5, budget: "ok" },
  { id: "bath", name: "Bath", dims: "9' × 9'", x0: -2, y0: 2, x1: 1, y1: 5, budget: "over" },
  { id: "hall", name: "", dims: "", x0: -2, y0: 0, x1: 1, y1: 2, budget: "ok" },
  { id: "master", name: "Master bedroom", dims: "18' × 18'", x0: 1, y0: -1, x1: 7, y1: 5, budget: "ok" },
  { id: "hall2", name: "", dims: "", x0: 0, y0: -1, x1: 1, y1: 0, budget: "ok" },
];
// rooms light up in this order as POs land (step 3)
const FLOW_ORDER = ["kitchen", "living", "master", "bed1", "bath", "utility"];

// wall segments in plan units, with gaps left for doors
const WALLS: [Pt, Pt][] = [
  [[-7, -5], [7, -5]], [[7, -5], [7, 5]], [[-7, 5], [7, 5]], [[-7, -5], [-7, -3.2]], [[-7, -2.2], [-7, 5]],
  [[0, -5], [0, -2.4]], [[0, -1.4], [0, -1]],
  [[0, -1], [1.2, -1]], [[2.2, -1], [4, -1]],
  [[4, -5], [4, -3.2]], [[4, -2.2], [4, -1]], [[4, -1], [7, -1]],
  [[-7, 0], [-1.6, 0]], [[-0.4, 0], [1, 0]],
  [[-2, 0], [-2, 0.4]], [[-2, 1.4], [-2, 5]],
  [[-2, 2], [-1.2, 2]], [[-0.4, 2], [1, 2]],
  [[1, -1], [1, 0.3]], [[1, 1.3], [1, 5]],
];
// windows on the outer walls (drawn as glass panes once the walls rise)
const WINDOWS: [Pt, Pt][] = [
  [[-5.6, -5], [-3.4, -5]], [[1, -5], [3, -5]], [[4.8, -5], [6.2, -5]],
  [[7, 0.6], [7, 2.6]], [[2.4, 5], [5.2, 5]], [[-5.8, 5], [-3.6, 5]],
];

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (c: number[], k = 1) => `rgb(${c.map((v) => Math.round(Math.min(255, v * k))).join(",")})`;

const INK = [52, 50, 45], CONCRETE = [250, 248, 244], FLOOR2D = [255, 255, 255], FLOOR3D = [244, 241, 236];
const BUDGET: Record<Room["budget"], number[]> = { ok: [214, 238, 223], watch: [252, 226, 196], over: [248, 208, 200] };
const SUN = [246, 172, 112];

export function draw(P: number, W = 560, H = 440): string {
  const tilt = ss(0.3, 1.05, P);
  const rise = 0.16 * ss(0.4, 1.0, P) + 0.84 * ss(1.3, 2.05, P);
  const labels2d = 1 - ss(0.15, 0.7, P);
  const tint = ss(2.45, 2.95, P);
  const solid = ss(0.2, 1.1, P); // blueprint lines → concrete
  const S = (W / 16.5) * (1 - 0.1 * tilt);
  const th = (-38 * Math.PI / 180) * tilt, ct = Math.cos(th), st = Math.sin(th);
  const squash = 1 - 0.47 * tilt;
  const Hh = 1.75 * rise;
  const cx = W / 2, cy = H / 2 + 10 + 34 * tilt;
  const proj = (x: number, y: number, z = 0): Pt => {
    const rx = x * ct - y * st, ry = x * st + y * ct;
    return [cx + rx * S, cy + ry * S * squash - z * S * 0.95 * tilt];
  };
  const depth = (x: number, y: number) => x * st + y * ct;
  const poly = (p: Pt[]) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const out: string[] = [];

  // ground shadow, growing with the walls
  if (tilt > 0.02) {
    const sh = [proj(-7.2, -5.2), proj(7.2, -5.2), proj(7.2, 5.2), proj(-7.2, 5.2)].map(([a, b]) => [a + 26 * tilt, b + 18 * tilt] as Pt);
    out.push(`<polygon points="${poly(sh)}" fill="rgba(40,46,52,${(0.14 * tilt).toFixed(3)})" filter="url(#fpBlur)"/>`);
  }
  // floors
  const flow = ss(1.85, 2.9, P);
  for (const r of ROOMS) {
    let c = mix(FLOOR2D, FLOOR3D, solid);
    const fi = FLOW_ORDER.indexOf(r.id);
    if (fi >= 0 && flow > 0 && tint < 1) {
      const lit = Math.max(0, Math.min(1, flow * 7 - fi)) * (1 - ss(2.35, 2.6, P)) ;
      c = mix(c, SUN, lit * 0.55);
    }
    if (tint > 0) c = mix(c, BUDGET[r.budget], tint);
    out.push(`<polygon points="${poly([proj(r.x0, r.y0), proj(r.x1, r.y0), proj(r.x1, r.y1), proj(r.x0, r.y1)])}" fill="${rgb(c)}"/>`);
  }
  // blueprint grid on the floor (fades as the model becomes solid)
  if (labels2d > 0.02) {
    const g: string[] = [];
    for (let x = -7; x <= 7; x += 1) { const a = proj(x, -5), b = proj(x, 5); g.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`); }
    for (let y = -5; y <= 5; y += 1) { const a = proj(-7, y), b = proj(7, y); g.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`); }
    out.push(`<path d="${g.join("")}" stroke="rgba(235,122,42,${(0.16 * labels2d).toFixed(3)})" stroke-width="1" fill="none"/>`);
  }
  // door swings (blueprint only): leaf from the hinge, arc back to the closed position
  if (labels2d > 0.02) {
    const doors: [Pt, Pt, Pt][] = [
      [[0, -2.4], [0, -1.4], [1, -2.4]], [[1.2, -1], [2.2, -1], [1.2, -2]], [[4, -3.2], [4, -2.2], [5, -3.2]],
      [[-2, 0.4], [-2, 1.4], [-3, 0.4]], [[-1.2, 2], [-0.4, 2], [-1.2, 2.8]], [[1, 0.3], [1, 1.3], [2, 0.3]], [[-7, -3.2], [-7, -2.2], [-6, -3.2]],
    ];
    const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const d = doors.map(([h, c, o]) => {
      const H2 = proj(h[0], h[1]), C2 = proj(c[0], c[1]), O2 = proj(o[0], o[1]);
      const K = proj(o[0] + c[0] - h[0], o[1] + c[1] - h[1]);
      return `M${f(H2)}L${f(O2)}Q${f(K)} ${f(C2)}`;
    });
    out.push(`<path d="${d.join("")}" stroke="rgba(52,50,45,${(0.4 * labels2d).toFixed(3)})" stroke-width="1" fill="none"/>`);
  }

  // walls as boxes, back to front; only faces turned toward the viewer are drawn
  const T = 0.13;
  const boxes = WALLS.map(([a, b]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const ex = (dx / L) * T, ey = (dy / L) * T; // extend ends so corners close
    const c: Pt[] = [
      [a[0] - ex + nx * T, a[1] - ey + ny * T], [b[0] + ex + nx * T, b[1] + ey + ny * T],
      [b[0] + ex - nx * T, b[1] + ey - ny * T], [a[0] - ex - nx * T, a[1] - ey - ny * T],
    ];
    return { c, d: depth((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
  }).sort((p, q) => p.d - q.d);
  const wallTop = rgb(mix(INK, [208, 200, 190], solid));
  for (const { c } of boxes) {
    if (Hh > 0.01 && tilt > 0.01) {
      for (let i = 0; i < 4; i++) {
        const p = c[i], q = c[(i + 1) % 4];
        // outward normal of this side, in plan; visible if it points toward the viewer
        const mx = (p[0] + q[0]) / 2 - (c[0][0] + c[2][0]) / 2, my = (p[1] + q[1]) / 2 - (c[0][1] + c[2][1]) / 2;
        if (depth(mx, my) <= 0) continue;
        const light = 0.9 + 0.08 * ((mx * -0.6 + my * -0.8) / (Math.hypot(mx, my) || 1));
        out.push(`<polygon points="${poly([proj(p[0], p[1]), proj(q[0], q[1]), proj(q[0], q[1], Hh), proj(p[0], p[1], Hh)])}" fill="${rgb(CONCRETE, light)}" stroke="rgba(150,140,128,.35)" stroke-width=".6"/>`);
      }
    }
    out.push(`<polygon points="${poly(c.map(([x, y]) => proj(x, y, Hh)))}" fill="${wallTop}"/>`);
  }
  // window glass
  if (rise > 0.3) {
    const a = ss(0.3, 0.7, rise);
    for (const [p, q] of WINDOWS) {
      const z0 = Hh * 0.35, z1 = Hh * 0.85;
      out.push(`<polygon points="${poly([proj(p[0], p[1], z0), proj(q[0], q[1], z0), proj(q[0], q[1], z1), proj(p[0], p[1], z1)])}" fill="rgba(186,212,226,${(0.75 * a).toFixed(3)})" stroke="rgba(120,140,150,${(0.5 * a).toFixed(3)})" stroke-width="0.8"/>`);
    }
  }
  // room labels: names + dimensions on the blueprint, names only on the model
  for (const r of ROOMS) {
    if (!r.name) continue;
    const [lx, ly] = proj((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
    const nameOpacity = 1 - 0.55 * ss(1.2, 1.9, P) + 0.55 * tint;
    out.push(`<text x="${lx.toFixed(1)}" y="${(ly - 2).toFixed(1)}" class="fp-name" opacity="${nameOpacity.toFixed(2)}">${r.name.toUpperCase()}</text>`);
    if (labels2d > 0.02) out.push(`<text x="${lx.toFixed(1)}" y="${(ly + 11).toFixed(1)}" class="fp-dim" opacity="${labels2d.toFixed(2)}">${r.dims}</text>`);
    if (tint > 0.02) {
      const tag = r.budget === "ok" ? "On budget" : r.budget === "watch" ? "Watch" : "Over";
      out.push(`<text x="${lx.toFixed(1)}" y="${(ly + 12).toFixed(1)}" class="fp-tag fp-${r.budget}" opacity="${tint.toFixed(2)}">${tag}</text>`);
    }
  }
  // overall dimension line (blueprint)
  if (labels2d > 0.02) {
    const a = proj(-7, -5.8), b = proj(7, -5.8);
    out.push(`<g opacity="${labels2d.toFixed(2)}" class="fp-dimline"><path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}M${a[0].toFixed(1)} ${(a[1] - 4).toFixed(1)}v8M${b[0].toFixed(1)} ${(b[1] - 4).toFixed(1)}v8"/><text x="${((a[0] + b[0]) / 2).toFixed(1)}" y="${(a[1] - 6).toFixed(1)}">42' 0"</text></g>`);
  }
  return out.join("");
}

export function mount(root: HTMLElement): () => void {
  const svg = root.querySelector<SVGGElement>("[data-fp]");
  const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-fp-step]"));
  const vis = root.querySelector<HTMLElement>(".fp-vis");
  const caps = Array.from(root.querySelectorAll<HTMLElement>(".fp-c"));
  let shown = -1;
  if (!svg || steps.length < 4) return () => {};
  let target = 0, P = 0, raf = 0, lastDrawn = -1, visible = true;

  const measure = () => {
    // progress = which step's middle is nearest the reading line, continuous in between
    const line = innerHeight * (innerWidth <= 900 ? 0.75 : 0.5);
    const mids = steps.map((el) => { const b = el.getBoundingClientRect(); return b.top + b.height / 2; });
    if (line <= mids[0]) target = 0;
    else if (line >= mids[3]) target = 3;
    else for (let i = 0; i < 3; i++) if (line >= mids[i] && line < mids[i + 1]) target = i + (line - mids[i]) / (mids[i + 1] - mids[i]);
  };
  const frame = () => {
    raf = 0;
    P += (target - P) * 0.14;
    if (Math.abs(target - P) < 0.002) P = target;
    // redraw the plan only when it has visibly moved: keeps scrolling light on phones
    if (Math.abs(P - lastDrawn) > (P === target ? 0 : 0.006)) {
      svg.innerHTML = draw(P);
      lastDrawn = P;
      const active = Math.min(3, Math.max(0, Math.round(P)));
      if (vis && vis.dataset.step !== String(active)) vis.dataset.step = String(active);
      if (active !== shown) {
        shown = active;
        steps.forEach((el, i) => el.classList.toggle("on", i === active));
        caps.forEach((el, i) => { el.classList.toggle("on", i === active); el.classList.toggle("past", i < active); });
      }
    }
    if (P !== target && visible) raf = requestAnimationFrame(frame);
  };
  const kick = () => { measure(); if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  io.observe(root);
  kick();
  return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener("scroll", kick); removeEventListener("resize", kick); };
}
