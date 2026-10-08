/**
 * The hero drawing: a 2BHK furniture layout drawn as a real architectural sheet
 * (walls, doors, windows, columns, gridlines, dimension strings), and a takeoff
 * interaction: point at a room, it gets highlighted like a QS marking up a print,
 * and a priced BOQ card for that room appears.
 *
 * planSVG() is a pure string builder, so the server can render the drawing into the
 * page (no layout shift, visible without JS). mount() adds the interaction.
 */

type Kind = "living" | "kitchen" | "utility" | "foyer" | "bed" | "bath" | "dress" | "balcony";
export type Room = { id: string; name: string; x: number; y: number; w: number; h: number; kind: Kind; wardrobe?: number };

export const ROOMS: Room[] = [
  { id: "bal", name: "Balcony", x: 0, y: 0, w: 3.6, h: 1.5, kind: "balcony" },
  { id: "liv", name: "Living & dining", x: 0, y: 1.5, w: 5.4, h: 4.5, kind: "living" },
  { id: "kit", name: "Kitchen", x: 5.4, y: 1.5, w: 3.0, h: 3.0, kind: "kitchen" },
  { id: "utl", name: "Utility", x: 8.4, y: 1.5, w: 1.8, h: 3.0, kind: "utility" },
  { id: "foy", name: "Foyer", x: 5.4, y: 4.5, w: 4.8, h: 1.5, kind: "foyer" },
  { id: "bd1", name: "Bedroom 1", x: 0, y: 6.0, w: 3.9, h: 4.5, kind: "bed", wardrobe: 0 },
  { id: "tlt", name: "Toilet", x: 3.9, y: 6.0, w: 2.1, h: 2.4, kind: "bath" },
  { id: "drs", name: "Dress", x: 3.9, y: 8.4, w: 2.1, h: 2.1, kind: "dress" },
  { id: "bd2", name: "Bedroom 2", x: 6.0, y: 6.0, w: 4.2, h: 4.5, kind: "bed", wardrobe: 64 },
];

/* ---------------- pricing (sample Bengaluru rates, Oct 2026) ---------------- */
export type Line = { item: string; qty: number; unit: string; rate: number; amt: number };
const SQFT = 10.7639;
const L = (item: string, qty: number, unit: string, rate: number): Line => {
  const q = Math.max(1, Math.round(qty));
  return { item, qty: q, unit, rate, amt: q * rate };
};
export function priceRoom(r: Room): Line[] {
  const a = r.w * r.h * SQFT; // floor, sq ft
  const walls = 2 * (r.w + r.h) * 2.9 * 0.82 * SQFT; // wall paint area less openings, sq ft
  switch (r.kind) {
    case "living":
      return [L("Vitrified tiles 800×800, laid", a, "sq ft", 145), L("Gypsum false ceiling with cove", a * 0.8, "sq ft", 120), L("Putty and two coats emulsion", walls, "sq ft", 32), L("TV unit, BWP ply and laminate", 12, "rft", 2800), L("Electrical points, modular", a / 16, "nos", 850)];
    case "kitchen":
      return [L("Modular kitchen, BWP ply, L-shape", 15, "rft", 9000), L("Granite countertop", 15, "rft", 1100), L("Dado tiles above counter", 4.6 * 0.6 * SQFT, "sq ft", 120), L("Anti-skid floor tiles", a, "sq ft", 130), L("Electrical points, modular", 10, "nos", 850)];
    case "utility":
      return [L("Anti-skid floor tiles", a, "sq ft", 110), L("Wall tiles to 1.2 m", 2 * (r.w + r.h) * 1.2 * SQFT, "sq ft", 95), L("Plumbing points", 3, "nos", 1800)];
    case "foyer":
      return [L("Vitrified tiles 800×800, laid", a, "sq ft", 145), L("Shoe cabinet, BWP ply", 5, "rft", 2600), L("Putty and two coats emulsion", walls * 0.6, "sq ft", 32)];
    case "bed":
      return [L("Laminate flooring, 8 mm", a, "sq ft", 140), L("Gypsum false ceiling", a * 0.7, "sq ft", 110), L("Putty and two coats emulsion", walls, "sq ft", 32), ...(r.wardrobe ? [L("Wardrobe, BWP ply, soft-close", r.wardrobe, "sq ft", 1450)] : []), L("Electrical points, modular", a / 18, "nos", 850)];
    case "bath":
      return [L("Waterproofing, two coats", a * 1.6, "sq ft", 65), L("Wall tiles, full height", 2 * (r.w + r.h) * 2.4 * SQFT, "sq ft", 120), L("Anti-skid floor tiles", a, "sq ft", 110), L("CP fittings and sanitaryware", 1, "set", 38000), L("Plumbing points", 6, "nos", 1800)];
    case "dress":
      return [L("Wardrobe, BWP ply, both walls", 72, "sq ft", 1450), L("Laminate flooring, 8 mm", a, "sq ft", 140), L("Profile lighting", 8, "rft", 650)];
    case "balcony":
      return [L("Anti-skid deck tiles", a, "sq ft", 120), L("Glass railing, SS posts", (r.w + 2 * r.h) * 3.281, "rft", 2200), L("Exterior paint", r.w * 1.2 * SQFT, "sq ft", 38)];
  }
}
export const roomTotal = (r: Room) => priceRoom(r).reduce((s, l) => s + l.amt, 0);
export const FLAT_TOTAL = ROOMS.reduce((s, r) => s + roomTotal(r), 0);
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/* ---------------- drawing geometry ---------------- */
const S = 48, OX = 104, OY = 104; // 1 m = 48 units
const VW = OX + 10.2 * S + 76, VH = OY + 10.5 * S + 40;
const X = (m: number) => +(OX + m * S).toFixed(1);
const Y = (m: number) => +(OY + m * S).toFixed(1);
const T_EXT = 0.23 * S, T_INT = 0.115 * S;

type Wall = { x1: number; y1: number; x2: number; y2: number; t: number };
type Opening = { dir: "h" | "v"; at: number; a: number; b: number; kind: "door" | "window" | "slide"; hinge?: number; swing?: 1 | -1 };

const WALLS: Wall[] = [
  // envelope
  { x1: 0, y1: 1.5, x2: 10.2, y2: 1.5, t: T_EXT },
  { x1: 10.2, y1: 1.5, x2: 10.2, y2: 10.5, t: T_EXT },
  { x1: 10.2, y1: 10.5, x2: 0, y2: 10.5, t: T_EXT },
  { x1: 0, y1: 10.5, x2: 0, y2: 1.5, t: T_EXT },
  // partitions
  { x1: 5.4, y1: 1.5, x2: 5.4, y2: 4.5, t: T_INT },
  { x1: 8.4, y1: 1.5, x2: 8.4, y2: 4.5, t: T_INT },
  { x1: 5.4, y1: 4.5, x2: 10.2, y2: 4.5, t: T_INT },
  { x1: 0, y1: 6.0, x2: 10.2, y2: 6.0, t: T_INT },
  { x1: 3.9, y1: 6.0, x2: 3.9, y2: 10.5, t: T_INT },
  { x1: 6.0, y1: 6.0, x2: 6.0, y2: 10.5, t: T_INT },
  { x1: 3.9, y1: 8.4, x2: 6.0, y2: 8.4, t: T_INT },
];

const OPENINGS: Opening[] = [
  { dir: "h", at: 1.5, a: 0.5, b: 3.1, kind: "slide" },
  { dir: "h", at: 1.5, a: 6.2, b: 7.6, kind: "window" },
  { dir: "h", at: 1.5, a: 8.9, b: 9.7, kind: "window" },
  { dir: "v", at: 10.2, a: 4.7, b: 5.7, kind: "door", hinge: 4.7, swing: -1 },
  { dir: "v", at: 10.2, a: 7.6, b: 9.2, kind: "window" },
  { dir: "h", at: 10.5, a: 7.1, b: 9.1, kind: "window" },
  { dir: "h", at: 10.5, a: 1.0, b: 2.9, kind: "window" },
  { dir: "v", at: 0, a: 7.3, b: 9.1, kind: "window" },
  { dir: "v", at: 0, a: 2.4, b: 4.6, kind: "window" },
  { dir: "h", at: 4.5, a: 6.0, b: 6.9, kind: "door", hinge: 6.0, swing: -1 },
  { dir: "v", at: 8.4, a: 3.4, b: 4.2, kind: "door", hinge: 4.2, swing: 1 },
  { dir: "h", at: 6.0, a: 2.6, b: 3.5, kind: "door", hinge: 3.5, swing: 1 },
  { dir: "h", at: 6.0, a: 4.55, b: 5.3, kind: "door", hinge: 4.55, swing: 1 },
  { dir: "h", at: 6.0, a: 6.5, b: 7.4, kind: "door", hinge: 6.5, swing: 1 },
  { dir: "v", at: 3.9, a: 9.2, b: 10.0, kind: "door", hinge: 10.0, swing: 1 },
];

const EPS = 1e-6;
function wallPieces(w: Wall): string[] {
  const horiz = Math.abs(w.y1 - w.y2) < EPS;
  const at = horiz ? w.y1 : w.x1;
  const lo = Math.min(horiz ? w.x1 : w.y1, horiz ? w.x2 : w.y2);
  const hi = Math.max(horiz ? w.x1 : w.y1, horiz ? w.x2 : w.y2);
  const ops = OPENINGS.filter((o) => (o.dir === "h") === horiz && Math.abs(o.at - at) < EPS && o.b > lo && o.a < hi).sort((p, q) => p.a - q.a);
  const half = 0; // butt caps; corners and junctions are covered by the columns
  const out: string[] = [];
  let cur = lo;
  for (const o of ops) {
    const end = o.a - half;
    if (end > cur + 0.01) out.push(seg(horiz, at, cur, end));
    cur = o.b + half;
  }
  if (hi > cur + 0.01) out.push(seg(horiz, at, cur, hi));
  return out;
  function seg(h: boolean, c: number, s: number, e: number) {
    return h ? `M${X(s)} ${Y(c)}H${X(e)}` : `M${X(c)} ${Y(s)}V${Y(e)}`;
  }
}

function openingSymbol(o: Opening): string {
  const w = o.b - o.a;
  if (o.kind === "door") {
    const h = o.hinge!, other = Math.abs(h - o.a) < EPS ? o.b : o.a, s = o.swing!;
    let P: [number, number], Q: [number, number], R: [number, number];
    if (o.dir === "h") { P = [h, o.at]; Q = [h, o.at + s * w]; R = [other, o.at]; }
    else { P = [o.at, h]; Q = [o.at + s * w, h]; R = [o.at, other]; }
    const cross = (Q[0] - P[0]) * (R[1] - P[1]) - (Q[1] - P[1]) * (R[0] - P[0]);
    const sweep = cross > 0 ? 1 : 0;
    return `<path class="dr" d="M${X(P[0])} ${Y(P[1])}L${X(Q[0])} ${Y(Q[1])}"/><path class="arc" d="M${X(Q[0])} ${Y(Q[1])}A${(w * S).toFixed(1)} ${(w * S).toFixed(1)} 0 0 ${sweep} ${X(R[0])} ${Y(R[1])}"/>`;
  }
  const t = (o.kind === "slide" ? T_EXT : T_EXT) / S;
  if (o.dir === "h") {
    const y0 = o.at - t / 2, y1 = o.at + t / 2;
    if (o.kind === "slide") {
      const m = (o.a + o.b) / 2;
      return `<path class="win" d="M${X(o.a)} ${Y(o.at - 0.04)}H${X(m + 0.1)}M${X(m - 0.1)} ${Y(o.at + 0.04)}H${X(o.b)}M${X(o.a)} ${Y(y0)}V${Y(y1)}M${X(o.b)} ${Y(y0)}V${Y(y1)}"/>`;
    }
    return `<path class="win" d="M${X(o.a)} ${Y(y0)}H${X(o.b)}M${X(o.a)} ${Y(o.at)}H${X(o.b)}M${X(o.a)} ${Y(y1)}H${X(o.b)}M${X(o.a)} ${Y(y0)}V${Y(y1)}M${X(o.b)} ${Y(y0)}V${Y(y1)}"/>`;
  }
  const x0 = o.at - t / 2, x1 = o.at + t / 2;
  return `<path class="win" d="M${X(x0)} ${Y(o.a)}V${Y(o.b)}M${X(o.at)} ${Y(o.a)}V${Y(o.b)}M${X(x1)} ${Y(o.a)}V${Y(o.b)}M${X(x0)} ${Y(o.a)}H${X(x1)}M${X(x0)} ${Y(o.b)}H${X(x1)}"/>`;
}

const rect = (x: number, y: number, w: number, h: number, extra = "") => `<rect x="${X(x)}" y="${Y(y)}" width="${(w * S).toFixed(1)}" height="${(h * S).toFixed(1)}"${extra}/>`;
const circ = (x: number, y: number, r: number) => `<circle cx="${X(x)}" cy="${Y(y)}" r="${(r * S).toFixed(1)}"/>`;

function furniture(): string {
  const f: string[] = [];
  // living: L-sofa, coffee table, TV unit, dining for six
  f.push(rect(0.3, 2.3, 0.85, 2.6), rect(0.3, 4.05, 2.2, 0.85), rect(1.55, 2.9, 1.0, 0.7), rect(5.05, 2.35, 0.25, 1.9));
  f.push(rect(2.9, 4.7, 1.8, 0.8));
  for (const cx of [3.2, 3.8, 4.4]) f.push(rect(cx - 0.2, 4.36, 0.4, 0.28), rect(cx - 0.2, 5.56, 0.4, 0.28));
  // kitchen: L counter, sink, hob
  f.push(`<path d="M${X(5.55)} ${Y(2.2)}H${X(8.25)}V${Y(4.35)}H${X(7.65)}V${Y(2.2)}"/>`, rect(5.55, 1.65, 2.7, 0.55), rect(6.0, 1.75, 0.8, 0.38), circ(7.6, 1.85, 0.09), circ(7.95, 1.85, 0.09), circ(7.6, 2.05, 0.09), circ(7.95, 2.05, 0.09));
  // utility: washer, sink
  f.push(rect(8.6, 1.7, 0.6, 0.6), circ(8.9, 2.0, 0.22), rect(9.4, 1.7, 0.6, 0.5));
  // foyer: shoe cabinet
  f.push(rect(8.3, 4.62, 1.6, 0.4));
  // bedroom 1: bed, side tables
  f.push(rect(0.7, 7.1, 1.8, 2.1), rect(0.85, 7.2, 0.7, 0.4), rect(1.65, 7.2, 0.7, 0.4), rect(0.25, 7.1, 0.4, 0.45), rect(2.55, 7.1, 0.4, 0.45));
  // bedroom 2: bed, side tables, wardrobe, study
  f.push(rect(7.4, 7.0, 1.8, 2.1), rect(7.55, 7.1, 0.7, 0.4), rect(8.35, 7.1, 0.7, 0.4), rect(6.95, 7.0, 0.4, 0.45), rect(9.25, 7.0, 0.4, 0.45), rect(6.12, 9.75, 2.2, 0.6), rect(9.0, 9.85, 1.05, 0.5));
  // toilet: WC, basin, shower
  f.push(rect(4.1, 6.15, 0.4, 0.2), `<ellipse cx="${X(4.3)}" cy="${Y(6.62)}" rx="${(0.18 * S).toFixed(1)}" ry="${(0.26 * S).toFixed(1)}"/>`, rect(5.25, 6.2, 0.6, 0.45), `<path d="M${X(4.0)} ${Y(7.3)}H${X(5.9)}" stroke-dasharray="3 3"/>`, circ(4.95, 7.85, 0.06));
  // dress: wardrobes both sides
  f.push(rect(4.0, 8.52, 0.6, 1.88), rect(5.3, 8.52, 0.6, 1.88));
  // balcony: planters
  f.push(rect(0.15, 0.12, 1.1, 0.35), rect(2.35, 0.12, 1.1, 0.35));
  return f.join("");
}

function dims(): string {
  const xs = [0, 3.9, 6.0, 10.2], ys = [0, 1.5, 6.0, 10.5];
  const yc = -0.6, xc = -0.6;
  const out: string[] = [];
  const tick = (x: number, y: number) => `M${(x - 4).toFixed(1)} ${(y + 4).toFixed(1)}L${(x + 4).toFixed(1)} ${(y - 4).toFixed(1)}`;
  // chain along top
  let d = `M${X(0)} ${Y(yc)}H${X(10.2)}`;
  xs.forEach((x) => (d += tick(X(x), Y(yc)) + `M${X(x)} ${Y(yc - 0.12)}V${Y(1.3)}`));
  // chain down the left
  d += `M${X(xc)} ${Y(0)}V${Y(10.5)}`;
  ys.forEach((y) => (d += tick(X(xc), Y(y)) + `M${X(xc - 0.12)} ${Y(y)}H${X(y === 0 ? -0.15 : -0.2)}`));
  out.push(`<path class="dim" d="${d}"/>`);
  for (let i = 0; i < xs.length - 1; i++) out.push(`<text class="dt" x="${X((xs[i] + xs[i + 1]) / 2)}" y="${Y(yc) - 5}">${Math.round((xs[i + 1] - xs[i]) * 1000)}</text>`);
  for (let i = 0; i < ys.length - 1; i++) {
    const cy = Y((ys[i] + ys[i + 1]) / 2);
    out.push(`<text class="dt" x="${X(xc) - 5}" y="${cy}" transform="rotate(-90 ${X(xc) - 5} ${cy})">${Math.round((ys[i + 1] - ys[i]) * 1000)}</text>`);
  }
  // grid bubbles and faint gridlines
  const gx = [["A", 0], ["B", 3.9], ["C", 6.0], ["D", 10.2]] as const, gy = [["1", 1.5], ["2", 6.0], ["3", 10.5]] as const;
  let g = "";
  gx.forEach(([, x]) => (g += `M${X(x)} ${Y(-1.42)}V${Y(-0.95)}`));
  gy.forEach(([, y]) => (g += `M${X(-1.42)} ${Y(y)}H${X(-0.95)}`));
  out.push(`<path class="grid" d="${g}"/>`);
  gx.forEach(([n, x]) => out.push(`<g class="bub"><circle cx="${X(x)}" cy="${Y(-1.7)}" r="12"/><text x="${X(x)}" y="${Y(-1.7) + 4}">${n}</text></g>`));
  gy.forEach(([n, y]) => out.push(`<g class="bub"><circle cx="${X(-1.7)}" cy="${Y(y)}" r="12"/><text x="${X(-1.7)}" y="${Y(y) + 4}">${n}</text></g>`));
  // structural columns at grid intersections
  const cols: string[] = [];
  for (const [, x] of gx) for (const [, y] of gy) cols.push(rect(x - 0.15, y - 0.15, 0.3, 0.3));
  out.push(`<g class="col">${cols.join("")}</g>`);
  // north point
  const nx = X(10.2) + 44, ny = Y(-1.5);
  out.push(`<g class="north"><circle cx="${nx}" cy="${ny}" r="15"/><path d="M${nx} ${ny - 13}L${nx + 6} ${ny + 8}L${nx} ${ny + 3}L${nx - 6} ${ny + 8}Z"/><text x="${nx}" y="${ny - 20}">N</text></g>`);
  return out.join("");
}

function roomLabel(r: Room): string {
  const cx = X(r.x + r.w / 2), cy = Y(r.y + r.h / 2);
  const area = (r.w * r.h).toFixed(1);
  const small = r.w * r.h < 4.5;
  const name = r.name.toUpperCase();
  if (small) return `<g class="rl"><text class="rn" x="${cx}" y="${cy + 3}">${name}</text></g>`;
  return `<g class="rl"><text class="rn" x="${cx}" y="${cy - 4}">${name}</text><text class="ra" x="${cx}" y="${cy + 10}">${Math.round(r.w * 1000)} × ${Math.round(r.h * 1000)} · ${area} m²</text></g>`;
}

/** Highlighter strokes for a room: broad, slightly uneven marker swipes clipped to the room. */
function highlight(r: Room, pre: string): string {
  const n = Math.max(2, Math.round(r.h / 0.48));
  const band = (r.h * S) / n;
  let s = "";
  for (let i = 0; i < n; i++) {
    const y = Y(r.y) + i * band - 1.5;
    const skew = ((i * 37) % 7) - 3; // deterministic unevenness
    s += `<rect class="hs" style="--i:${i}" x="${X(r.x) - 6}" y="${(y + skew * 0.3).toFixed(1)}" width="${(r.w * S + 12).toFixed(1)}" height="${(band + 3).toFixed(1)}" rx="3"/>`;
  }
  return `<g class="hl" clip-path="url(#${pre}c-${r.id})">${s}</g>`;
}

export function planSVG(opts: { ink?: boolean; prefix?: string } = {}): string {
  const pre = opts.prefix ?? (opts.ink ? "k" : "");
  const clips = ROOMS.map((r) => `<clipPath id="${pre}c-${r.id}">${rect(r.x + 0.06, r.y + 0.06, r.w - 0.12, r.h - 0.12)}</clipPath>`).join("");
  const walls = WALLS.flatMap(wallPieces).map((d, i) => `<path class="w${i < 8 ? " ext" : ""}" style="--d:${(i * 0.045).toFixed(2)}s" d="${d}" pathLength="1"/>`).join("");
  const rail = `<path class="rail" d="M${X(0)} ${Y(1.5 - 0.12)}V${Y(0)}H${X(3.6)}V${Y(1.5 - 0.12)}M${X(0.08)} ${Y(1.38)}V${Y(0.08)}H${X(3.52)}V${Y(1.38)}"/>`;
  const rooms = ROOMS.map((r) => `<g class="room" data-room="${r.id}">${highlight(r, pre)}<rect class="hit" x="${X(r.x)}" y="${Y(r.y)}" width="${(r.w * S).toFixed(1)}" height="${(r.h * S).toFixed(1)}"/></g>`).join("");
  return `<svg class="plan-svg${opts.ink ? " ink" : ""}" viewBox="0 0 ${VW} ${VH}"${opts.ink ? ' aria-hidden="true"' : ' role="img"'} aria-label="Furniture layout of a 2BHK flat: balcony, living and dining, kitchen, utility, foyer, two bedrooms, toilet and dress. Each room can be priced as a bill of quantities." xmlns="http://www.w3.org/2000/svg">
<defs>${clips}</defs>
<g class="rooms">${rooms}</g>
<g class="furn">${furniture()}</g>
<g class="walls">${walls}${rail}</g>
<g class="ops">${OPENINGS.map(openingSymbol).join("")}</g>
<g class="anno">${dims()}${ROOMS.map(roomLabel).join("")}</g>
</svg>`;
}

/* ---------------- interaction ---------------- */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function mount(root: HTMLElement): () => void {
  const stage = root.querySelector<HTMLElement>("[data-plan-stage]") || root;
  if (!stage.querySelector("svg")) stage.insertAdjacentHTML("afterbegin", planSVG());
  const svg = stage.querySelector("svg")!;
  const dock = root.querySelector<HTMLElement>("[data-schedule]");
  const card = document.createElement("div");
  card.className = dock ? "takeoff docked" : "takeoff";
  card.setAttribute("aria-live", "polite");
  (dock || stage).appendChild(card);
  const cross = document.createElement("div");
  cross.className = "cross";
  cross.innerHTML = `<i class="cx"></i><i class="cy"></i><span class="cr"></span>`;
  stage.appendChild(cross);
  const counter = root.querySelector<HTMLElement>("[data-priced]");
  const runningTotal = root.querySelector<HTMLElement>("[data-running]");
  const priced = new Set<string>();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = !matchMedia("(hover: hover) and (pointer: fine)").matches;

  let active = "";
  let idleTimer = 0, cycleTimer = 0, cycleIdx = 0, userActive = false, visible = true;

  const show = (id: string, fromUser: boolean) => {
    if (id === active) return;
    active = id;
    svg.querySelectorAll<SVGGElement>(".room").forEach((g) => g.classList.toggle("on", g.dataset.room === id));
    root.classList.toggle("has-room", !!id);
    if (!id) { card.classList.remove("show"); return; }
    const r = ROOMS.find((x) => x.id === id)!;
    const lines = priceRoom(r);
    const total = lines.reduce((s, l) => s + l.amt, 0);
    card.innerHTML =
      `<header><b>${esc(r.name)}</b><span>${(r.w * r.h).toFixed(1)} m², ${Math.round(r.w * r.h * SQFT)} sq ft</span></header>` +
      `<ol>${lines.map((l, i) => `<li style="--i:${i}"><span class="it">${esc(l.item)}</span><span class="q">${l.qty.toLocaleString("en-IN")} ${l.unit}</span><span class="a">${inr(l.amt)}</span></li>`).join("")}</ol>` +
      `<footer><span>Room total</span><b>${inr(total)}</b></footer>`;
    place(r);
    card.classList.remove("show");
    void card.offsetWidth;
    card.classList.add("show");
    if (fromUser) {
      priced.add(id);
      if (counter) counter.textContent = `${priced.size} of ${ROOMS.length}`;
      if (runningTotal) runningTotal.textContent = inr([...priced].reduce((s, k) => s + roomTotal(ROOMS.find((x) => x.id === k)!), 0));
    }
  };

  const place = (r: Room) => {
    if (dock) return;
    const sb = stage.getBoundingClientRect();
    const k = sb.width / VW;
    const cw = Math.min(300, sb.width - 24);
    card.style.width = cw + "px";
    const right = (X(r.x + r.w) + 10) * k, left = X(r.x) * k - cw - 10;
    let x = right + cw < sb.width - 8 ? right : left > 8 ? left : Math.max(8, (sb.width - cw) / 2);
    let y = Y(r.y) * k;
    const ch = card.offsetHeight || 220;
    y = Math.max(8, Math.min(y, sb.height - ch - 8));
    if (sb.width < 520) { x = 8; y = sb.height + 8; card.style.width = sb.width - 16 + "px"; }
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };

  // pointer: crosshair + room under cursor
  let raf = 0, px = 0, py = 0;
  const onMove = (e: PointerEvent) => {
    px = e.clientX; py = e.clientY;
    userActive = true;
    stopCycle();
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const frame = () => {
    raf = 0;
    const sb = stage.getBoundingClientRect();
    const lx = px - sb.left, ly = py - sb.top;
    const inside = lx >= 0 && ly >= 0 && lx <= sb.width && ly <= sb.height;
    cross.classList.toggle("show", inside && !touch);
    if (!inside) return;
    cross.style.setProperty("--x", lx + "px");
    cross.style.setProperty("--y", ly + "px");
    const k = sb.width / VW;
    const mx = (lx / k - OX) / S, my = (ly / k - OY) / S;
    (cross.querySelector(".cr") as HTMLElement).textContent = mx >= -0.2 && my >= -0.2 && mx <= 10.4 && my <= 10.7 ? `x ${mx.toFixed(2)} m   y ${my.toFixed(2)} m` : "";
    const hit = ROOMS.find((r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
    if (hit) show(hit.id, true);
  };
  const onLeave = () => {
    cross.classList.remove("show");
    userActive = false;
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(startCycle, 2500);
  };
  const onTap = (e: Event) => {
    const g = (e.target as Element).closest?.(".room") as SVGGElement | null;
    if (g?.dataset.room) { stopCycle(); show(g.dataset.room, true); clearTimeout(idleTimer); idleTimer = window.setTimeout(startCycle, 6000); }
  };

  // idle: walk the highlighter through the rooms so the drawing is never static
  const order = ["liv", "kit", "bd2", "tlt", "bd1", "bal", "foy", "drs", "utl"];
  const step = () => { if (!visible || userActive || document.hidden) return; show(order[cycleIdx++ % order.length], false); };
  function startCycle() { if (reduce || userActive) return; stopCycle(); step(); cycleTimer = window.setInterval(step, 2600); }
  function stopCycle() { clearInterval(cycleTimer); cycleTimer = 0; }

  stage.addEventListener("pointermove", onMove, { passive: true });
  stage.addEventListener("pointerleave", onLeave);
  stage.addEventListener("click", onTap);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(stage);
  const onResize = () => { const r = ROOMS.find((x) => x.id === active); if (r) place(r); };
  addEventListener("resize", onResize);

  // first room appears once the walls have drawn in
  const first = window.setTimeout(() => (reduce ? show("liv", false) : startCycle()), reduce ? 0 : 1900);

  return () => {
    clearTimeout(first); clearTimeout(idleTimer); stopCycle(); cancelAnimationFrame(raf);
    io.disconnect(); removeEventListener("resize", onResize);
    stage.removeEventListener("pointermove", onMove); stage.removeEventListener("pointerleave", onLeave); stage.removeEventListener("click", onTap);
    card.remove(); cross.remove();
  };
}
