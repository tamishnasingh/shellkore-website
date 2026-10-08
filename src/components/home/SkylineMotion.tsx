/**
 * Hero skyline as motion graphics: an architect's line drawing that draws itself in.
 * Back towers sketch in first in a light line, front towers in ink, then floor lines, a few windows
 * glow warm, two tower cranes work (trolley glides, hook rises and falls), a dimension marker measures
 * the tallest tower, and the ground line sweeps out from the centre. Pure SVG + CSS animation:
 * no canvas, no images, nothing to download. Deterministic, so server and client render the same.
 */
const W = 1440, G = 400; // drawing width, ground line

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

type Tower = { x0: number; x1: number; top: number; crown?: [number, number, number]; glass: boolean; d: number; back: boolean };

function towers(): Tower[] {
  const r = rng(41);
  const out: Tower[] = [];
  for (const back of [true, false]) {
    for (const side of [-1, 1]) {
      let edge = back ? 18 : 0; // distance in from the outer edge
      while (edge < (back ? 340 : 300)) {
        const w = back ? 44 + r() * 50 : 52 + r() * 62;
        const k = 1 - Math.min(1, edge / 360); // taller toward the outer edges
        const h = back ? 110 + k * 180 + r() * 36 : 56 + k * 150 + r() * 30;
        const xa = side < 0 ? edge : W - edge - w, xb = xa + w;
        const top = G - h;
        const crown: Tower["crown"] = h > 160 && r() < 0.5 ? [xa + w * 0.18, xb - w * 0.18, top - 18 - r() * 16] : undefined;
        out.push({ x0: xa, x1: xb, top, crown, glass: r() < 0.45, d: (back ? 0.1 : 0.55) + (1 - k) * 0.5 + r() * 0.25, back });
        edge += w + (back ? 10 + r() * 22 : 16 + r() * 26);
      }
    }
  }
  return out;
}

const outline = (t: Tower) =>
  t.crown
    ? `M${t.x0} ${G}V${t.top}H${t.crown[0]}V${t.crown[2]}H${t.crown[1]}V${t.top}H${t.x1}V${G}`
    : `M${t.x0} ${G}V${t.top}H${t.x1}V${G}`;

export function SkylineMotion() {
  const T = towers();
  const r = rng(7);
  const front = T.filter((t) => !t.back);
  const tallest = front.reduce((a, b) => (b.top < a.top ? b : a), front[0]);
  // windows that glow: a handful, on front towers
  const lit: { x: number; y: number; d: number }[] = [];
  for (const t of front) {
    const cols = Math.floor((t.x1 - t.x0 - 12) / 14), rows = Math.floor((G - t.top - 20) / 18);
    for (let i = 0; i < 2; i++) if (r() < 0.75 && cols > 0 && rows > 1) lit.push({ x: t.x0 + 8 + Math.floor(r() * cols) * 14, y: t.top + 12 + Math.floor(r() * (rows - 1)) * 18, d: 2.4 + r() * 3 });
  }
  // cranes over two mid-height front sites
  const sites = [front.filter((t) => t.x1 < W / 2).sort((a, b) => b.x1 - a.x1)[2], front.filter((t) => t.x0 > W / 2).sort((a, b) => a.x0 - b.x0)[2]].filter(Boolean) as Tower[];

  return (
    <>
    <svg className="skm" viewBox={`0 0 ${W} 420`} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="skmFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FBFAF7" stopOpacity=".96" />
          <stop offset="1" stopColor="#F7F6F2" stopOpacity=".7" />
        </linearGradient>
        <linearGradient id="skmGround" gradientUnits="userSpaceOnUse" x1="0" x2={W} y1="0" y2="0">
          <stop offset="0" stopColor="#16150F" stopOpacity="0" />
          <stop offset=".2" stopColor="#16150F" stopOpacity=".35" />
          <stop offset=".8" stopColor="#16150F" stopOpacity=".35" />
          <stop offset="1" stopColor="#16150F" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* back layer: light pencil */}
      <g className="skm-back">
        {T.filter((t) => t.back).map((t, i) => (
          <path key={i} d={outline(t)} pathLength={1} className="skm-line" style={{ ["--d" as string]: `${t.d}s` }} />
        ))}
      </g>

      {/* front layer: ink, filled so it sits in front of the back layer */}
      <g className="skm-front">
        {front.map((t, i) => {
          const floors: string[] = [];
          for (let y = G - 18; y > t.top + 8; y -= 18) floors.push(`M${t.x0 + 6} ${y}H${t.x1 - 6}`);
          const mull: string[] = [];
          if (t.glass) for (let x = t.x0 + 14; x < t.x1 - 6; x += 14) mull.push(`M${x} ${t.top + 6}V${G}`);
          return (
            <g key={i} style={{ ["--d" as string]: `${t.d}s` }}>
              <path d={outline(t)} className="skm-fill" />
              <path d={outline(t)} pathLength={1} className="skm-line ink" />
              <path d={floors.join("")} pathLength={1} className="skm-floor" />
              {mull.length > 0 && <path d={mull.join("")} pathLength={1} className="skm-floor mull" />}
            </g>
          );
        })}
      </g>

      {/* tower cranes */}
      {sites.map((t, i) => {
        const side = t.x1 < W / 2 ? -1 : 1; // jib points out, away from the headline
        const mx = side < 0 ? t.x0 + 14 : t.x1 - 14, top = t.top - 56, jl = 120, cj = 34;
        const j0 = mx - side * cj, j1 = mx + side * jl;
        return (
          <g key={i} className="skm-crane" style={{ ["--d" as string]: `${1.6 + i * 0.25}s`, ["--dir" as string]: side }}>
            <path d={`M${mx - 4} ${G}V${top}M${mx + 4} ${G}V${top}`} pathLength={1} className="skm-line sun" />
            <path d={Array.from({ length: Math.floor((G - top) / 16) }, (_, k) => `M${mx - 4} ${G - k * 16}L${mx + 4} ${G - k * 16 - 16}`).join("")} pathLength={1} className="skm-floor sun" />
            <path d={`M${j0} ${top}H${j1}M${j0} ${top + 6}H${j1}M${mx} ${top - 24}L${j1 - side * 20} ${top}M${mx} ${top - 24}L${j0} ${top}`} pathLength={1} className="skm-line sun jib" />
            <rect x={j0 - (side > 0 ? 0 : 16)} y={top + 6} width={16} height={10} className="skm-cw" />
          </g>
        );
      })}

      {/* dimension marker on the tallest front tower */}
      {tallest && (
        <g className="skm-dim" transform={`translate(${tallest.x0 < W / 2 ? tallest.x1 + 18 : tallest.x0 - 18} 0)`}>
          <path d={`M-5 ${tallest.top}H5M0 ${tallest.top}V${G}M-5 ${G}H5`} pathLength={1} />
          <text x={tallest.x0 < W / 2 ? 8 : -8} y={(tallest.top + G) / 2} textAnchor={tallest.x0 < W / 2 ? "start" : "end"}>{((G - tallest.top) / 4.2).toFixed(1)} m</text>
        </g>
      )}

      {/* ground line sweeping out from the centre */}
      <path d={`M${W / 2} ${G}H0`} pathLength={1} className="skm-ground" />
      <path d={`M${W / 2} ${G}H${W}`} pathLength={1} className="skm-ground" />
    </svg>
    {/* the only parts that keep moving live in their own small layer, so the big drawing never repaints */}
    <svg className="skm skm-live" viewBox={`0 0 ${W} 420`} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {lit.map((w, i) => <rect key={i} x={w.x} y={w.y} width={8} height={10} rx={1} className="skm-win" style={{ ["--d" as string]: `${w.d}s` }} />)}
      {sites.map((t, i) => {
        const side = t.x1 < W / 2 ? -1 : 1;
        const mx = side < 0 ? t.x0 + 14 : t.x1 - 14, top = t.top - 56;
        return (
          <g key={i} className="skm-crane" style={{ ["--d" as string]: `${1.6 + i * 0.25}s`, ["--dir" as string]: side }}>
            <g className="skm-trolley">
              <rect x={mx + side * 60 - 5} y={top + 6} width={10} height={4} />
              <line x1={mx + side * 60} y1={top + 10} x2={mx + side * 60} y2={top + 60} className="skm-cable" />
              <rect x={mx + side * 60 - 7} y={top + 60} width={14} height={9} className="skm-load" />
            </g>
          </g>
        );
      })}
    </svg>
    </>
  );
}
