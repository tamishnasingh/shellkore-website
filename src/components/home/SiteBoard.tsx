/**
 * "Every site, live" board: an isometric blueprint with Shellkore as the hub and each project site as
 * a small building around it. Drawn as SVG on the server; the `sites` island lights up one site at a
 * time and sends a pulse down its line to the hub.
 */
const U = 30; // one grid unit in px
const C = 0.866;
const iso = (x: number, y: number, z = 0): [number, number] => [(x - y) * C * U, (x + y) * 0.5 * U - z * U];
const pts = (...p: [number, number][]) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

type Site = { city: string };
// footprint (w, d), height, and whether it is still going up
const SHAPES = [
  { w: 1.2, d: 1.2, h: 3.1, build: false },
  { w: 1.5, d: 1.1, h: 1.3, build: false },
  { w: 1.3, d: 1.3, h: 1.9, build: true },
  { w: 1.6, d: 1.2, h: 1.1, build: false },
  { w: 1.1, d: 1.1, h: 2.5, build: false },
  { w: 1.3, d: 1.5, h: 1.5, build: true },
  { w: 1.4, d: 1.2, h: 1.0, build: false },
  { w: 1.2, d: 1.0, h: 0.8, build: false },
];

function Box({ x, y, w, d, h, build }: { x: number; y: number; w: number; d: number; h: number; build: boolean }) {
  const x0 = x - w / 2, y0 = y - d / 2, x1 = x + w / 2, y1 = y + d / 2;
  const solid = build ? h * 0.55 : h; // a site still going up: finished floors, then a frame
  const top = pts(iso(x0, y0, solid), iso(x1, y0, solid), iso(x1, y1, solid), iso(x0, y1, solid));
  const left = pts(iso(x0, y1, 0), iso(x1, y1, 0), iso(x1, y1, solid), iso(x0, y1, solid));
  const right = pts(iso(x1, y0, 0), iso(x1, y1, 0), iso(x1, y1, solid), iso(x1, y0, solid));
  const floors: [number, number][][] = [];
  for (let z = 0.4; z < solid - 0.1; z += 0.4) {
    floors.push([iso(x0 + 0.12, y1, z), iso(x1 - 0.12, y1, z)]);
    floors.push([iso(x1, y1 - 0.12, z), iso(x1, y0 + 0.12, z)]);
  }
  return (
    <g className="bx">
      <polygon className="f-l" points={left} />
      <polygon className="f-r" points={right} />
      <polygon className="f-t" points={top} />
      {floors.map(([a, b], i) => <line key={i} className="win" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />)}
      {build && (
        <g className="frame">
          {[[x0, y1], [x1, y1], [x1, y0]].map(([a, b], i) => {
            const p = iso(a, b, solid), q = iso(a, b, h);
            return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />;
          })}
          <polyline points={pts(iso(x0, y1, h), iso(x1, y1, h), iso(x1, y0, h))} />
          <polyline points={pts(iso(x0, y1, (solid + h) / 2), iso(x1, y1, (solid + h) / 2), iso(x1, y0, (solid + h) / 2))} />
          {/* a small tower crane beside the frame: mast, jib, counter-jib and a hook */}
          {(() => {
            const m0 = iso(x1 + 0.25, y0 - 0.25, 0), m1 = iso(x1 + 0.25, y0 - 0.25, h + 1);
            const j0 = iso(x1 + 0.25, y0 - 0.25 + 0.5, h + 1), j1 = iso(x1 + 0.25, y0 - 0.25 - 1.3, h + 1);
            const hk = iso(x1 + 0.25, y0 - 0.25 - 1.0, h + 1), hb = iso(x1 + 0.25, y0 - 0.25 - 1.0, h + 0.4);
            return (
              <g className="crane">
                <line x1={m0[0]} y1={m0[1]} x2={m1[0]} y2={m1[1]} />
                <line x1={j0[0]} y1={j0[1]} x2={j1[0]} y2={j1[1]} />
                <line className="hook" x1={hk[0]} y1={hk[1]} x2={hb[0]} y2={hb[1]} />
                <rect x={hb[0] - 2.5} y={hb[1]} width={5} height={4} rx={1} />
              </g>
            );
          })()}
        </g>
      )}
    </g>
  );
}

export function SiteBoard({ sites }: { sites: Site[] }) {
  const n = Math.min(sites.length, SHAPES.length);
  const R = 4.0;
  const nodes = sites.slice(0, n).map((s, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + Math.PI / n; // offset so no site hides behind the hub
    const sh = SHAPES[i];
    return { ...s, i, x: Math.cos(a) * R, y: Math.sin(a) * R, ...sh, w: sh.w * 0.85, d: sh.d * 0.85 };
  });
  // paint back to front
  type Node = (typeof nodes)[number];
  const order: (Node | null)[] = [...nodes, null].sort((p, q) => (p ? p.x + p.y : 0) - (q ? q.x + q.y : 0));
  const grid: number[] = Array.from({ length: 13 }, (_, k) => k - 6).filter((k) => Math.abs(k) <= 5.9);
  const [hx, hy] = iso(0, 0, 0.35);

  return (
    <svg className="board" viewBox="-300 -235 600 420" role="img" aria-label="Project sites around one connected Shellkore ledger">
      <defs>
        <radialGradient id="plate" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F4EEE5" />
        </radialGradient>
      </defs>
      {/* blueprint plate */}
      <polygon className="plate" points={pts(iso(-5.9, -5.9), iso(5.9, -5.9), iso(5.9, 5.9), iso(-5.9, 5.9))} fill="url(#plate)" />
      <polygon className="plate-edge" points={pts(iso(5.9, -5.9), iso(5.9, 5.9), iso(5.9, 5.9, -0.25), iso(5.9, -5.9, -0.25))} />
      <polygon className="plate-edge l" points={pts(iso(-5.9, 5.9), iso(5.9, 5.9), iso(5.9, 5.9, -0.25), iso(-5.9, 5.9, -0.25))} />
      {grid.map((k) => {
        const a = iso(k, -5.9), b = iso(k, 5.9), c = iso(-5.9, k), d = iso(5.9, k);
        return <g key={k} className="grid"><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} /><line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} /></g>;
      })}

      {/* lines from every site into the hub */}
      {nodes.map((s) => {
        const [x1, y1] = iso(s.x, s.y), [x2, y2] = iso(0, 0);
        return (
          <g key={s.i} className="ln" data-line={s.i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="ln-base" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="ln-pulse" pathLength={100} />
          </g>
        );
      })}

      {order.map((s) =>
        !s ? (
          <g key="hub" className="hub">
            <Box x={0} y={0} w={1.8} d={1.8} h={0.35} build={false} />
            <ellipse className="hub-ring" cx={0} cy={iso(0, 0, 0.35)[1]} rx={U * 1.9} ry={U * 0.95} />
            <image className="hub-mark" href="/brand/shellkore-mark.png" x={hx - 27} y={hy - 70} width={54} height={57} />
          </g>
        ) : (
          <g key={s.i} className="site" data-node={s.i} tabIndex={-1}>
            <ellipse className="ping" cx={iso(s.x, s.y)[0]} cy={iso(s.x, s.y)[1]} rx={U * 1.2} ry={U * 0.6} />
            <g className="lift"><Box x={s.x} y={s.y} w={s.w} d={s.d} h={s.h} build={s.build} /></g>
          </g>
        ),
      )}
      {nodes.map((s) => {
        const [lx, ly] = iso(s.x + s.w / 2, s.y + s.d / 2);
        return <text key={s.i} className="bd-city" data-label={s.i} x={lx} y={ly + 16} textAnchor="middle">{s.city}</text>;
      })}
    </svg>
  );
}
