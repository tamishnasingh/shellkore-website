/** Small inline icons and illustrations, drawn in code so the page ships no image files. */
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const I = {
  home: <svg viewBox="0 0 16 16" {...P}><path d="M2.5 7.5 8 3l5.5 4.5V13H9.5V9.5h-3V13h-4z" /></svg>,
  folder: <svg viewBox="0 0 16 16" {...P}><path d="M2.5 4.5h4l1 1.5h6v7h-11z" /></svg>,
  doc: <svg viewBox="0 0 16 16" {...P}><path d="M4 2.5h6l2.5 2.5v8.5H4zM6.5 8h4M6.5 10.5h4" /></svg>,
  cart: <svg viewBox="0 0 16 16" {...P}><path d="M2.5 3.5h2l1.5 7h6.5l1-5H5" /><circle cx="7" cy="13" r=".8" /><circle cx="12" cy="13" r=".8" /></svg>,
  chart: <svg viewBox="0 0 16 16" {...P}><path d="M2.5 13.5h11M4.5 11V8M7.5 11V5M10.5 11V7M13 11V3.5" /></svg>,
  users: <svg viewBox="0 0 16 16" {...P}><circle cx="6" cy="5.5" r="2" /><path d="M2.5 13c.5-2 2-3 3.5-3s3 1 3.5 3M11 7.2a1.6 1.6 0 1 0 0-3.2M11.5 9.6c1 .3 1.8 1.2 2 3" /></svg>,
  lock: <svg viewBox="0 0 16 16" {...P}><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>,
  wa: <svg viewBox="0 0 16 16" {...P}><path d="M3 13l.8-2.6A5.5 5.5 0 1 1 6 12.3z" /></svg>,
  truck: <svg viewBox="0 0 16 16" {...P}><path d="M1.5 4.5h8v6h-8zM9.5 7h3l2 2v1.5h-5" /><circle cx="4.5" cy="11.5" r="1.2" /><circle cx="12" cy="11.5" r="1.2" /></svg>,
  camera: <svg viewBox="0 0 16 16" {...P}><path d="M2.5 5.5h2.5l1-1.5h4l1 1.5h2.5v7h-11z" /><circle cx="8" cy="8.8" r="2" /></svg>,
  rupee: <svg viewBox="0 0 16 16" {...P}><path d="M4.5 3h7M4.5 6h7M4.5 3c3.5 0 4 3 4 3s-.5 3-4 3l5 4" /></svg>,
  check: <svg viewBox="0 0 16 16" {...P} strokeWidth={2}><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>,
  dcheck: <svg viewBox="0 0 16 16" {...P} strokeWidth={1.8}><path d="M1.5 8.5 4.5 11.5 10 5M7.5 11.5 13.5 5" /></svg>,
  layers: <svg viewBox="0 0 16 16" {...P}><path d="M8 2.5 14 5.5 8 8.5 2 5.5zM2 8.5l6 3 6-3M2 11l6 3 6-3" /></svg>,
  shield: <svg viewBox="0 0 16 16" {...P}><path d="M8 2 13 4v4c0 3-2.2 5.2-5 6-2.8-.8-5-3-5-6V4z" /><path d="M5.8 8.2 7.4 9.8 10.4 6.6" /></svg>,
  spark: <svg viewBox="0 0 16 16" {...P}><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.4 3.4l2.1 2.1M10.5 10.5l2.1 2.1M3.4 12.6l2.1-2.1M10.5 5.5l2.1-2.1" /></svg>,
};

export function Mark({ size = 24 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="logo-mark" src="/brand/shellkore-mark.png" alt="" width={Math.round(size * (302 / 320))} height={size} decoding="async" />;
}

/** A city skyline at dawn, with cranes: the site that never sleeps. */
export function Skyline() {
  return (
    <svg viewBox="0 0 1440 180" preserveAspectRatio="xMidYMax slice" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M0 180V132h60v-24h40v24h30V96h56v84M186 180V118h44V84h30v96M260 180v-60h70v60M330 180V70h52v110M382 180v-46h46v46" />
      <path d="M470 180V40h4v140M474 46h140M474 46l22 18M496 64h-22M600 46v36M592 82h16v12h-16zM520 46l14-14 14 14M548 46l14-14 14 14" />
      <path d="M640 180V104h80v76M720 180V60h62v120M782 180v-90h48v90M830 180v-40h60v40M890 180V110h70v70" />
      <path d="M1000 180V30h4v150M1004 36h120M1004 36l20 16M1024 52h-20M1110 36v44M1102 80h16v12h-16z" />
      <path d="M1060 180V92h56v88M1116 180V124h40V74h44v106M1200 180v-64h60v64M1260 180V98h52v82M1312 180v-50h56v50M1368 180V118h72v62" />
      <path d="M352 90h8M352 104h8M352 118h8M742 80h8M742 96h8M742 112h8M760 80h8M760 96h8M1176 92h8M1176 108h8M1280 118h8M1280 134h8" opacity=".7" />
    </svg>
  );
}

/** A room, sketched like a quick site photo, for the photo-to-BOQ moments. */
export function RoomSketch() {
  return (
    <svg viewBox="0 0 240 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="240" height="200" fill="#EDE6DB" />
      <path d="M0 0 62 46h116L240 0" fill="#F4EFE7" />
      <path d="M0 200 62 150h116l62 50" fill="#DBD9D5" />
      <rect x="62" y="46" width="116" height="104" fill="#F1EBE2" />
      <rect x="92" y="66" width="56" height="44" fill="#DCE6EE" stroke="#BFBDB9" />
      <path d="M120 66v44M92 88h56" stroke="#BFBDB9" />
      <path d="M0 0 62 46M240 0l-62 46M0 200l62-50M240 200l-62-50" stroke="#BFBDB9" />
      <rect x="140" y="124" width="30" height="26" fill="#D0CECA" />
      <g fill="#fff" stroke="#16150F" strokeWidth="1">
        <rect x="76" y="26" width="58" height="14" rx="3" />
        <rect x="150" y="80" width="48" height="14" rx="3" />
        <rect x="88" y="160" width="58" height="14" rx="3" />
      </g>
      <g style={{ fontFamily: "var(--font)" }} fontSize="7.5" fill="#57534A" textAnchor="middle" fontWeight="600">
        <text x="105" y="36">CEILING 640</text>
        <text x="174" y="90">WINDOW</text>
        <text x="117" y="170">FLOOR 820</text>
      </g>
      <path d="M62 140h116" stroke="#16150F" strokeDasharray="3 3" />
    </svg>
  );
}

const WHO = [
  // contractor: crane and slab
  <svg key="c" viewBox="0 0 200 110" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M40 110V14h5v96M45 20h110M45 20l20 15M65 35H45M150 20v32M142 52h16v12h-16zM60 20l12-12 12 12M86 20l12-12 12 12" /><path d="M96 110V78h60v32M20 110h170" /></svg>,
  // builder: towers
  <svg key="b" viewBox="0 0 200 110" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M48 110V26h44v84M92 110V50h44v60M136 110V72h30v38M20 110h170" /><path d="M58 40h8M74 40h8M58 56h8M74 56h8M58 72h8M74 72h8M58 88h8M74 88h8M102 64h8M118 64h8M102 80h8M118 80h8" opacity=".7" /></svg>,
  // owner: house
  <svg key="o" viewBox="0 0 200 110" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M56 110V58l44-34 44 34v52M40 110h120" /><rect x="88" y="78" width="24" height="32" /><path d="M66 70h14v14H66zM120 70h14v14h-14z" opacity=".7" /></svg>,
  // designer: sofa and lamp
  <svg key="d" viewBox="0 0 200 110" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M40 98h112M40 98V80q0-8 8-8h96q8 0 8 8v18M52 72V62q0-8 8-8h72q8 0 8 8v10M48 98v10M144 98v10" /><path d="M170 108V30M162 30h16l-4-14h-8z" opacity=".7" /></svg>,
];
export function WhoArt({ i }: { i: number }) {
  return WHO[i % WHO.length];
}

export function Sparkline({ points, color = "#16150F" }: { points: number[]; color?: string }) {
  const w = 100, h = 20, max = Math.max(...points), min = Math.min(...points);
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - 2 - ((p - min) / (max - min || 1)) * (h - 4)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const last = xy[xy.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d}L${w} ${h}L0 ${h}Z`} fill={color} opacity=".1" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={color} />
    </svg>
  );
}

/** Logos for the "Built by operators at" line, keyed by name (lowercase). Files live in public/brand/operators/.
 *  `scale` balances them optically (a stacked mark needs more height than a wide wordmark). Names not listed show as text. */
const OPERATOR_LOGOS: Record<string, { src: string; w: number; h: number; scale: number }> = {
  ux9: { src: "/brand/operators/ux9.png", w: 305, h: 160, scale: 1 },
  bricobrick: { src: "/brand/operators/bricobrick.png", w: 140, h: 160, scale: 1.45 },
  "sie detailers": { src: "/brand/operators/sie-detailers.png", w: 752, h: 160, scale: 1.05 },
};

export function Operator({ name, height = 22 }: { name: string; height?: number }) {
  const logo = OPERATOR_LOGOS[name.trim().toLowerCase().replace(/[-\s]+/g, " ")];
  if (!logo) return <span className="op">{name}</span>;
  const h = Math.round(height * logo.scale);
  return (
    // --logo masks the sheen to the logo's own shape
    <span className="op logo" style={{ ["--logo" as string]: `url(${logo.src})` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.src} alt={name} title={name} width={Math.round((logo.w / logo.h) * h)} height={h} decoding="async" />
      <span className="op-sheen" aria-hidden="true"><i /></span>
    </span>
  );
}
