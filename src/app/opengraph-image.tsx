import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Shellkore — the construction OS. Leads to cash on one connected ledger.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when a Shellkore link is shared on WhatsApp, LinkedIn or X. */
const OPS = [
  { file: "ux9.png", h: 40, w: 76 },
  { file: "bricobrick.png", h: 52, w: 46 },
  { file: "sie-detailers.png", h: 40, w: 188 },
];

export default async function OG() {
  const mark = `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public/brand/shellkore-mark.png"))).toString("base64")}`;
  const logos = await Promise.all(OPS.map(async (o) => ({ ...o, src: `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public/brand/operators", o.file))).toString("base64")}` })));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(180deg,#EEF1F2 0%,#F7F6F2 55%,#FCE3CC 100%)", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={mark} width={60} height={64} alt="" />
          <div style={{ fontSize: 38, fontWeight: 700, color: "#16150F", letterSpacing: -1 }}>Shellkore</div>
          <div style={{ marginLeft: 16, fontSize: 20, color: "#B4561B", background: "#FDE9D7", padding: "8px 18px", borderRadius: 999 }}>Waitlist open</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#16150F", letterSpacing: -3, lineHeight: 1.02, maxWidth: 980 }}>The operating system for construction.</div>
          <div style={{ fontSize: 30, color: "#47443D", maxWidth: 900 }}>Photo-to-BOQ, WhatsApp approvals, procurement and live project P&L on one ledger.</div>
        </div>
        <div style={{ display: "flex", gap: 28, alignItems: "center", fontSize: 22, color: "#6C6860" }}>
          <span>Built by operators at</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logos.map((l) => <img key={l.file} src={l.src} width={l.w} height={l.h} alt="" />)}
        </div>
      </div>
    ),
    size,
  );
}
