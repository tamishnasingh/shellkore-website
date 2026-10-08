import { getContent } from "@/lib/content";
import { DEFAULTS } from "@/lib/defaults";
import { WaitlistForm } from "@/components/WaitlistForm";
import { CopyButton } from "@/components/CopyButton";
import { chart, compute, inr, ringDash, PERIODS, PRESETS, SLIDERS, type Inputs } from "@/islands/calc";
import { SiteBoard } from "@/components/home/SiteBoard";
import { Island } from "@/components/islands/Island";
import { Toolkit } from "@/components/home/Toolkit";
import { Promises, ContactHub, Ecosystem, Crews, Maintenance } from "@/components/home/Services";
import { I, Mark, Skyline, RoomSketch, WhoArt, Sparkline } from "@/components/home/Art";

export const revalidate = 300;

/* ---------- sample project data (clearly a sample job; used across the page) ---------- */
const BOQ: [string, string, string, string, string][] = [
  ["1.1", "Gypsum false ceiling, 12.5 mm", "640 sq ft", "110", "70,400"],
  ["2.1", "Vitrified tiles 800×800, laid", "820 sq ft", "145", "1,18,900"],
  ["3.1", "Putty and two coats emulsion", "2,150 sq ft", "32", "68,800"],
  ["4.2", "TV unit, BWP ply and laminate", "14 rft", "2,800", "39,200"],
  ["5.1", "Electrical points, modular", "46 nos", "850", "39,100"],
];
const FLOW: [string, string, string, string][] = [
  ["L", "Lead LD-1042", "Rohan Kulkarni, 3BHK interiors", "Qualified"],
  ["E", "Estimate EST-2291", "Approved on WhatsApp, 11:42", "₹18.40L"],
  ["P", "Project PRJ-318", "Week 4 of 11, on track", "Live"],
  ["PO", "PO-7781", "BWP ply, from BOQ lines 4.1–4.2", "₹2.86L"],
  ["IN", "Invoice INV-0447", "Milestone 2 of 4, paid", "₹4.60L"],
];
const ORBIT_R = 190, SOON_R = 262, C = 280;
const pos = (deg: number, r: number) => ({ left: `${((C + r * Math.cos((deg * Math.PI) / 180)) / 560) * 100}%`, top: `${((C + r * Math.sin((deg * Math.PI) / 180)) / 560) * 100}%` });
const TOOL_COLORS = ["#1FA855", "#1D6F42", "#2E5AAC", "#D8262B", "#FF7A59", "#0A7FD0"];
const LEDGER: [string, string][] = [
  ["Approvals on WhatsApp", "built in"],
  ["BOQs priced from site photos", "live"],
  ["Books, invoices and payments", "live"],
  ["Estimates straight from the BOQ", "linked"],
  ["Leads tied to their projects", "linked"],
  ["Light enough for site teams", "mobile"],
];
const TENET_ICONS = [I.layers, I.shield, I.spark];

/* ---- 3D construction roadmap: textures, the callout pinned to the building, and a product card per phase */
const RM_TEX = Object.fromEntries(
  ["concrete", "concrete_n", "soil", "soil_n", "brick", "brick_n", "grass", "grass_n", "asphalt", "asphalt_n", "ply"].map((k) => [k, `/roadmap/${k}.webp`]),
) as Record<string, string>;
RM_TEX.blob = "/roadmap/blob.png";
const RM_CALLOUTS = ["Grid A–E / 1–4 set out", "Twin · 1,284 BOQ lines", "Raft · M30 · 186 m³", "Slab poured today", "Brickwork L4 · GRN matched", "Curtain wall · RA bill #4", "Handover · 21.7% margin"];
const RM_WIDGETS: React.ReactNode[] = [
  <div key="0" className="rw rw-takeoff">
    <div className="rw-h"><span className="rw-ai">{I.spark}</span><b>AI takeoff</b><small>A-101 → A-109</small></div>
    <ul>
      <li><span>Concrete M30</span><b>1,920 m³</b></li>
      <li><span>Steel Fe550D</span><b>212 t</b></li>
      <li><span>Brickwork 230 mm</span><b>4,860 m²</b></li>
    </ul>
    <div className="rw-f"><span>1,284 BOQ lines priced</span><b>₹18.4 Cr</b></div>
  </div>,
  <div key="1" className="rw rw-wa">
    <div className="rw-h"><span className="rw-av">{I.wa}</span><b>Lakeside Developers</b><small>WhatsApp · Client</small></div>
    <div className="rw-msg"><span>EST-2291 · Tower B</span><b>₹18.40 Cr</b></div>
    <div className="rw-ok">Approved {I.dcheck}</div>
  </div>,
  <div key="2" className="rw rw-po">
    <div className="rw-h"><span className="rw-ic">{I.truck}</span><b>PO-7781</b><small>UltraTech OPC 53 · 2,400 bags</small></div>
    <ol className="rw-steps"><li className="is-done">Ordered</li><li className="is-done">Delivered</li><li className="is-now">Billed</li></ol>
    <div className="rw-f"><span>Matched to GRN-0412 and bill</span><b>₹9.8 L</b></div>
  </div>,
  <div key="3" className="rw rw-prog">
    <div className="rw-h"><span className="rw-ic">{I.camera}</span><b>Site log · today</b><small>46 crew · 18 photos</small></div>
    <ul>
      <li><span>Level 6 slab</span><i style={{ ["--w" as string]: "100%" }} /><b>100%</b></li>
      <li><span>Level 7 columns</span><i style={{ ["--w" as string]: "62%" }} /><b>62%</b></li>
      <li><span>Steel used vs BOQ</span><i style={{ ["--w" as string]: "48%" }} /><b>−2.1%</b></li>
    </ul>
  </div>,
  <div key="4" className="rw rw-co">
    <div className="rw-h"><span className="rw-ic">{I.doc}</span><b>CO-014</b><small>Extra powder room, L3</small></div>
    <div className="rw-msg"><span>Priced from your rates</span><b>+₹1.86 L</b></div>
    <div className="rw-ok">Client approved {I.dcheck}</div>
  </div>,
  <div key="5" className="rw rw-inv">
    <div className="rw-h"><span className="rw-ic">{I.rupee}</span><b>RA Bill #4</b><small>From measured progress</small></div>
    <div className="rw-msg"><span>Raised · paid in 3 days</span><b>₹2.40 Cr</b></div>
    <div className="rw-meter"><i style={{ ["--w" as string]: "68%" }} /><span>68% of contract billed</span></div>
  </div>,
  <div key="6" className="rw rw-pl">
    <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="32" className="t" /><circle cx="40" cy="40" r="32" className="v" pathLength={100} strokeDasharray="21.7 100" /></svg>
    <div><small>Project margin, live</small><b>21.7%</b><span>Revenue ₹18.4 Cr · Cost ₹14.4 Cr</span></div>
  </div>,
];

export default async function Home() {
  const c = await getContent();
  const { hero, platform, steps, product, why, who, faq, cta, settings, calculator, sites, promise, contact, ecosystem, crews, maintenance, tools } = c;
  const assume = { timePct: num(calculator.estimateTimeSavedPct, 60, 0, 95), leakPct: num(calculator.leakageRecoveredPct, 50, 0, 95), hourly: num(calculator.hourlyCost, 600, 0, 100000) };
  const calc0 = compute(Object.fromEntries(SLIDERS.map((x) => [x.key, x.def])) as Inputs, assume, 12);
  const chart0 = chart(calc0.costToday / 12, calc0.costAfter / 12, 12);
  const lines = splitTitle(hero.title);
  // seven roadmap phases; older saved content with fewer steps is filled from the defaults
  const rmItems = DEFAULTS.steps.items.slice(0, 7).map((d, i) => steps.items[i] ?? d);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SoftwareApplication", name: "Shellkore", applicationCategory: "BusinessApplication", operatingSystem: "Web", description: hero.lede, publisher: { "@type": "Organization", name: "Techfnatic Labs", email: settings.contactEmail, sameAs: [settings.linkedin] } },
      { "@type": "FAQPage", mainEntity: faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };

  return (
    <Island name="reveal">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* ============ HERO: full-bleed 3D, the finished tower with its digital twin ============ */}
      <section className="hero h3" aria-label="Shellkore">
        <Island name="hero3d" className="h3-stage" data={{ tex: JSON.stringify(RM_TEX) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h3-poster" src="/roadmap/hero-poster.webp" alt="" aria-hidden="true" fetchPriority="high" decoding="async" />
          <canvas className="h3-canvas" aria-hidden="true" />
          <div className="h3-veil" aria-hidden="true" />
          <div className="h3-pin pin-scan" data-pin aria-hidden="true"><i /><span><b>AI takeoff</b><em data-h3-level>Level 4</em><small>BOQ synced</small></span></div>
          <div className="h3-pin pin-top" data-pin aria-hidden="true"><i /><span><b>Lakeside Tower B</b><small>Handover in 12 days</small></span></div>
          <div className="h3-pin pin-low" data-pin aria-hidden="true"><i /><span><small>Margin, live</small><b>21.7%</b></span></div>
        </Island>
        <div className="wrap h3-copy">
          <span className="h3-kick"><i />Construction OS · Waitlist open</span>
          <h1>{lines.map((l, i) => <span className="l" key={i}><span>{l}</span></span>)}</h1>
          <p className="sub">{hero.subtitle}</p>
          <WaitlistForm note={hero.note} source="hero" joined />
          <div className="hero-meta">
            <a href="#how">See how it's built<span aria-hidden="true"> →</span></a>
            <span className="sep" aria-hidden="true" />
            <a href="#tools">Try the BOQ calculator</a>
          </div>
        </div>
        <a className="h3-scroll" href="#product" aria-label="Scroll down"><i /></a>
      </section>

      <section className="hero-after">
        <Island name="stage" className="wrap stage">
          <div className="stage3d">
          <div className="blueprint" aria-hidden="true" />
          <div className="ghost g2" aria-hidden="true"><div className="g-chrome"><i /><i /><i /><span>app.shellkore.com/finance</span></div><div className="g-body"><div className="g-bars">{[38, 52, 46, 64, 58, 76, 70, 88].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div></div></div>
          <div className="ghost g1" aria-hidden="true"><div className="g-chrome"><i /><i /><i /><span>app.shellkore.com/procurement</span></div><div className="g-body"><div className="g-rows">{[0, 1, 2, 3, 4].map((i) => <i key={i} />)}</div></div></div>
          <div className="window" role="img" aria-label="The Shellkore app showing a sample project, Prestige Lakeside Tower B: contract value, committed costs, payments received, a 21.7% projected margin, its bill of quantities and a live activity feed.">
            <div className="chrome" aria-hidden="true"><div className="dots"><i /><i /><i /></div><div className="url">{I.lock}<span>app.shellkore.com/projects/prestige-lakeside</span></div><div style={{ width: 46 }} /></div>
            <div className="app" aria-hidden="true">
              <aside className="app-side">
                <div className="ws"><span className="av">U</span>UX9 Interiors</div>
                <div className="ni">{I.home}Home</div>
                <div className="ni on">{I.folder}Projects</div>
                <div className="ni">{I.doc}Estimates</div>
                <div className="ni">{I.cart}Procurement</div>
                <div className="ni">{I.chart}Finance</div>
                <div className="ni">{I.users}Team</div>
                <div className="side-h">Active projects</div>
                <div className="proj"><i className="live" />Prestige Lakeside, B</div>
                <div className="proj"><i />Sobha Dream Acres, V12</div>
                <div className="proj"><i />Whitefield office</div>
              </aside>
              <div className="app-main">
                <div className="ph"><div><b>Prestige Lakeside, Tower B</b><small>3BHK interiors for Rohan Kulkarni · Sample project</small></div><span className="chip ok"><i />On track</span></div>
                <div className="tabs-mini"><span className="on">Overview</span><span>BOQ</span><span>Purchase orders</span><span>Site</span><span>Invoices</span></div>
                <div className="kpis">
                  <div className="kpi"><small>Contract</small><b>₹18.40L</b><Sparkline points={[3, 3, 3, 3, 3, 3]} color="#B9B2A5" /></div>
                  <div className="kpi"><small>Committed</small><b>₹9.86L</b><Sparkline points={[1, 2, 3.2, 4.1, 5.8, 7]} color="#16150F" /></div>
                  <div className="kpi"><small>Received</small><b>₹3.68L</b><Sparkline points={[0, 0, 2, 2, 3.68, 3.68]} color="#2E8B57" /></div>
                  <div className="kpi hl"><small>Projected margin</small><b>21.7%</b><Sparkline points={[18, 19.2, 19, 20.4, 21, 21.7]} /></div>
                </div>
                <table className="tbl">
                  <thead><tr><th>#</th><th>BOQ item</th><th>Qty</th><th className="r">Rate ₹</th><th className="r">Amount ₹</th></tr></thead>
                  <tbody>{BOQ.map((r, i) => <tr key={r[0]} className={i === 0 ? "new" : undefined}><td className="mono">{r[0]}</td><td className="it">{r[1]}</td><td>{r[2]}</td><td className="r">{r[3]}</td><td className="r">{r[4]}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="app-feed">
                <div className="feed-h">Activity<span className="chip sun"><i />Live</span></div>
                <div className="ev"><span className="ic wa">{I.wa}</span><div><b>Rohan approved EST-2291</b><small>On WhatsApp · 11:42</small></div></div>
                <div className="ev"><span className="ic">{I.truck}</span><div><b>PO-7781 delivered to site</b><small>Kaveri Ply &amp; Laminates · 10:15</small></div></div>
                <div className="ev"><span className="ic sun">{I.camera}</span><div><b>14 site photos added</b><small>Imran, site supervisor · 09:40</small></div></div>
                <div className="ev"><span className="ic">{I.rupee}</span><div><b>INV-0447 paid</b><small>₹4,60,000 · Yesterday</small></div></div>
                <div className="ev"><span className="ic">{I.doc}</span><div><b>Change order CO-14 raised</b><small>Wardrobe veneer · Yesterday</small></div></div>
              </div>
            </div>
          </div>

          <div className="float f-wa" data-depth="1.6" aria-hidden="true">
            <div className="wa-h"><span className="av">{I.wa}</span><div><b>Rohan Kulkarni</b><small>WhatsApp</small></div></div>
            <div className="wa-b">
              <div className="wa-msg">Estimate for your 3BHK, with the kitchen upgrade.
                <div className="wa-doc"><span>EST-2291</span><b>₹18,40,000</b></div>
                <div className="wa-btns"><span data-approve>Approve</span><span>Changes</span></div>
              </div>
              <div className="wa-reply" data-reply>Approved {I.dcheck}</div>
            </div>
          </div>
          <div className="float f-po" data-depth="1.2" aria-hidden="true">
            <span className="ic">{I.truck}</span>
            <div><b>PO-7781 delivered</b><small>BWP ply · ₹2,86,000 · from BOQ</small></div>
          </div>
          </div>
          <div className="floor" aria-hidden="true" />
        </Island>
      </section>

      {/* ============ PROMISES + ONE POINT OF CONTACT ============ */}
      <Promises c={promise} />
      <ContactHub c={contact} />

      {/* ============ PLATFORM / ECOSYSTEM ============ */}
      <section className="sec" id="platform">
        <div className="wrap eco">
          <div className="eco-copy rv">
            <span className="kicker">Platform</span>
            <h2>{platform.heading}</h2>
            <p className="lede">{platform.lede}</p>
            <ul className="tenets">
              {platform.tenets.map((t, i) => (
                <li key={t.title}><span className="ic" aria-hidden="true">{TENET_ICONS[i % 3]}</span><b>{t.title}</b><p>{t.body}</p></li>
              ))}
            </ul>
          </div>
          <Island name="orbit" className="orbit rv">
            <svg viewBox="0 0 560 560" aria-hidden="true">
              <circle className="ring soon" cx={C} cy={C} r={SOON_R} />
              {platform.liveModules.slice(0, 6).map((_, i) => {
                const a = ((-90 + i * 60) * Math.PI) / 180;
                return <line key={i} className="spoke" x1={C + 95 * Math.cos(a)} y1={C + 95 * Math.sin(a)} x2={C + ORBIT_R * Math.cos(a)} y2={C + ORBIT_R * Math.sin(a)} />;
              })}
              <circle className="ring" cx={C} cy={C} r={ORBIT_R} />
              <path className="flow" d={`M${C} ${C - ORBIT_R} a${ORBIT_R} ${ORBIT_R} 0 1 1 -0.01 0`} />
            </svg>
            <div className="core">
              <Mark size={26} />
              <b>Shellkore</b>
              <small data-core-text>One ledger for every lead, estimate, PO and invoice.</small>
            </div>
            {platform.liveModules.slice(0, 6).map((m, i) => (
              <span key={m.name} className="node" style={pos(-90 + i * 60, ORBIT_R)} data-desc={m.desc} tabIndex={0}>
                <span className="n">{i + 1}</span>{m.name}
              </span>
            ))}
            {platform.soon.slice(0, 2).map((s, i) => (
              <span key={s.name} className="node soon" style={pos(i === 0 ? 125 : 55, SOON_R)}>
                <b>{s.name}</b><small>Coming soon</small>
              </span>
            ))}
          </Island>
        </div>
      </section>

      {/* ============ EVERY SITE, LIVE (site board) ============ */}
      <section className="sec sites" id="sites" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Island name="sites" className="sites-grid">
            <div className="sites-copy">
              <div className="sec-head rv" style={{ marginBottom: 28 }}>
                <span className="kicker">Every site, live</span>
                <h2>{sites.heading}</h2>
                <p className="lede">{sites.lede}</p>
              </div>
              <ol className="feed" aria-label="Live updates from project sites">
                {sites.items.map((it, i) => (
                  <li key={it.city + i} tabIndex={0} data-site data-city={it.city} className={i === 0 ? "on" : undefined}>
                    <span className="dot" aria-hidden="true" />
                    <div><b>{it.event}</b><small>{it.city} · {it.project}</small></div>
                    <time>{it.time}</time>
                  </li>
                ))}
              </ol>
              <p className="sites-note">{sites.note}</p>
            </div>
            <div className="board-wrap">
              <div className="board-glow" aria-hidden="true" />
              <SiteBoard sites={sites.items} />
              <div className="now" data-now>
                <span className="live-dot" /><div><small data-now-city>{sites.items[0]?.city}</small><b data-now-text>{sites.items[0]?.event}</b></div>
              </div>
            </div>
          </Island>
        </div>
      </section>

      {/* ============ HOW IT WORKS: 3D construction roadmap ============ */}
      <section className="rm" id="how" aria-label="How it works">
        <div className="wrap sec-head rv">
          <span className="kicker">How it works</span>
          <h2>{steps.heading}</h2>
          <p className="lede">{steps.lede}</p>
        </div>
        <Island name="roadmap" className="rm-track" data={{ tex: JSON.stringify(RM_TEX) }}>
          <div className="rm-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rm-poster" src="/roadmap/poster.webp" data-end="/roadmap/poster-end.webp" alt="" aria-hidden="true" decoding="async" loading="lazy" />
            <canvas className="rm-canvas" aria-hidden="true" />
            <div className="rm-shade" aria-hidden="true" />

            <div className="rm-hud" aria-hidden="true">
              <span className="rm-proj"><i />Lakeside Tower B · G+8</span>
              <span className="rm-stat"><small>Timeline</small><b data-hud="day">Day 0</b></span>
              <span className="rm-stat"><small>Built</small><b data-hud="pct">0%</b></span>
              <span className="rm-stat"><small>Spent of ₹18.4 Cr</small><b data-hud="spent">₹0.0 Cr</b></span>
            </div>
            <span className="rm-bar" aria-hidden="true"><i data-hud="bar" /></span>

            <ol className="rm-rail" aria-label="Project roadmap">
              {rmItems.map((st, i) => (
                <li key={i} className={i === 0 ? "on" : undefined}>
                  <button type="button" data-go={i}><i /><span>{st.kicker}</span></button>
                </li>
              ))}
            </ol>

            <div className="rm-panel">
              <div className="rm-count"><b data-rm-n>01</b><span>/ 0{rmItems.length}</span></div>
              <div className="rm-stack">
                {rmItems.map((st, i) => (
                  <article key={i} className={`rm-ph${i === 0 ? " on" : ""}`} data-callout={RM_CALLOUTS[i]} aria-hidden={i !== 0}>
                    <span className="rm-k">{st.kicker}</span>
                    <h3>{st.title}</h3>
                    <p>{st.body}</p>
                    <div className="rm-w">{RM_WIDGETS[i]}</div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rm-callout" aria-hidden="true"><i /><span /></div>
            <div className="rm-hint" aria-hidden="true">Scroll to build<i /></div>
          </div>
        </Island>
      </section>

      {/* ============ FREE TOOLS, EVERYONE GAINS, CREWS, MAINTENANCE ============ */}
      <Toolkit kicker={tools.kicker} heading={tools.heading} lede={tools.lede} note={tools.note} />
      <Ecosystem c={ecosystem} />
      <Crews c={crews} />
      <Maintenance c={maintenance} />

      {/* ============ TOOLS MERGE ============ */}
      <section className="sec" id="replaces" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head center rv">
            <span className="kicker">Why one system</span>
            <h2>{why.heading}</h2>
            <p className="lede">{why.lede}</p>
          </div>
          <Island name="merge" className="merge">
            <div className="tools">
              {why.tools.slice(0, 6).map((t, i) => (
                <div className="tool" key={t.name} style={{ ["--i" as string]: i }}>
                  <span className="lg" style={{ background: TOOL_COLORS[i % TOOL_COLORS.length] }} aria-hidden="true">{t.name[0]}</span>
                  <b>{t.name}</b><small>{t.pain}</small>
                </div>
              ))}
            </div>
            <svg className="wires" viewBox="0 0 200 400" preserveAspectRatio="none" aria-hidden="true">
              {why.tools.slice(0, 6).map((_, i) => {
                const y1 = 33 + i * 67, y2 = 112 + i * 38;
                return <path key={i} pathLength={1} style={{ ["--i" as string]: i }} d={`M0 ${y1} C 100 ${y1}, 100 ${y2}, 200 ${y2}`} />;
              })}
            </svg>
            <div className="ledger">
              <div className="lh"><Mark size={22} /><b>{why.us}</b><span className="chip ok"><i />One ledger</span></div>
              {LEDGER.map(([k, v]) => <div className="lrow" key={k}>{I.check}<span>{k}</span><span>{v}</span></div>)}
              <p style={{ color: "var(--muted)", fontSize: ".86rem", marginTop: 10 }}>{why.usNote}</p>
            </div>
          </Island>
        </div>
      </section>

      {/* ============ PRODUCT TOUR ============ */}
      <section className="sec" id="product" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head center rv">
            <span className="kicker">Product</span>
            <h2>{product.heading}</h2>
            <p className="lede">{product.lede}</p>
          </div>
          <Island name="tour">
            <div className="tour-tabs" role="tablist" aria-label="Product screens">
              {product.screens.slice(0, 4).map((s, i) => (
                <button key={i} className="tour-tab" role="tab" id={`tt-${i}`} aria-controls={`tv-${i}`} aria-selected={i === 0} tabIndex={i === 0 ? 0 : -1}>{s.tab}<i><b /></i></button>
              ))}
            </div>
            <div className="tour">
              <div className="tour-win rv">
                <div className="chrome" aria-hidden="true"><div className="dots"><i /><i /><i /></div><div className="url">{I.lock}<span data-url>app.shellkore.com/boq</span></div><div style={{ width: 46 }} /></div>
                <div className="tour-body">
                  <div className="tview on" id="tv-0" role="tabpanel" aria-labelledby="tt-0" data-url="app.shellkore.com/boq">
                    <div className="ph"><div><b>BOQ · Living room</b><small>Priced on your Bengaluru rate card</small></div><span className="chip sun"><i />From 1 photo</span></div>
                    <table className="tbl"><thead><tr><th>#</th><th>Item</th><th>Qty</th><th className="r">Rate ₹</th><th className="r">Amount ₹</th></tr></thead>
                      <tbody>{BOQ.map((r) => <tr key={r[0]}><td className="mono">{r[0]}</td><td className="it">{r[1]}</td><td>{r[2]}</td><td className="r">{r[3]}</td><td className="r">{r[4]}</td></tr>)}</tbody>
                      <tfoot><tr><td /><td>Total</td><td /><td /><td className="r">₹3,36,400</td></tr></tfoot></table>
                  </div>
                  <div className="tview" id="tv-1" role="tabpanel" aria-labelledby="tt-1" data-url="app.shellkore.com/estimates/est-2291">
                    <div className="ph"><div><b>EST-2291 · Revision 2</b><small>Rohan Kulkarni · Sent on WhatsApp</small></div><span className="chip ok"><i />Approved 11:42</span></div>
                    <table className="tbl"><thead><tr><th>Section</th><th className="r">Amount ₹</th><th className="r">Share</th></tr></thead>
                      <tbody>{([["Carpentry and joinery", "8,20,000", "44.6%"], ["Flooring", "3,15,000", "17.1%"], ["False ceiling", "2,10,000", "11.4%"], ["Painting", "1,85,000", "10.1%"], ["Plumbing and sanitary", "1,70,000", "9.2%"], ["Electrical", "1,40,000", "7.6%"]] as const).map((r) => <tr key={r[0]}><td className="it">{r[0]}</td><td className="r">{r[1]}</td><td className="r">{r[2]}</td></tr>)}</tbody>
                      <tfoot><tr><td>Total, excluding GST</td><td className="r">₹18,40,000</td><td /></tr></tfoot></table>
                  </div>
                  <div className="tview" id="tv-2" role="tabpanel" aria-labelledby="tt-2" data-url="app.shellkore.com/procurement">
                    <div className="ph"><div><b>Purchase orders · PRJ-318</b><small>Raised from BOQ lines</small></div><span className="chip"><i />3 open</span></div>
                    <table className="tbl"><thead><tr><th>PO</th><th>Vendor</th><th>From BOQ</th><th className="r">Value ₹</th><th className="r">Status</th></tr></thead>
                      <tbody>{([["PO-7781", "Kaveri Ply & Laminates", "4.1–4.2", "2,86,000", "Delivered", "ok"], ["PO-7782", "Bharat Tile Depot", "2.1", "1,18,900", "In transit", "sun"], ["PO-7783", "Metro Electricals", "5.1", "64,500", "Approved", ""], ["PO-7784", "Sai Gypsum Works", "1.1", "70,400", "Draft", ""]] as const).map((r) => <tr key={r[0]}><td className="mono">{r[0]}</td><td className="it">{r[1]}</td><td>{r[2]}</td><td className="r">{r[3]}</td><td className="r"><span className={`chip ${r[5]}`}>{r[4]}</span></td></tr>)}</tbody>
                      <tfoot><tr><td /><td>Committed</td><td /><td className="r">₹5,39,800</td><td /></tr></tfoot></table>
                  </div>
                  <div className="tview" id="tv-3" role="tabpanel" aria-labelledby="tt-3" data-url="app.shellkore.com/finance/prj-318">
                    <div className="ph"><div><b>Project P&amp;L · PRJ-318</b><small>Updated as POs and payments post</small></div><span className="chip sun"><i />Live</span></div>
                    <div className="kpis">
                      <div className="kpi"><small>Contract</small><b>₹18.40L</b></div>
                      <div className="kpi"><small>Cost to date</small><b>₹9.86L</b></div>
                      <div className="kpi"><small>Received</small><b>₹3.68L</b></div>
                      <div className="kpi hl"><small>Projected margin</small><b>21.7%</b></div>
                    </div>
                    <div className="mil">
                      <div><small>M1 Mobilisation</small><b>₹3.68L</b><br /><span className="chip ok">Paid</span></div>
                      <div><small>M2 Carpentry</small><b>₹4.60L</b><br /><span className="chip sun">Due 18 Oct</span></div>
                      <div><small>M3 Finishes</small><b>₹5.52L</b><br /><span className="chip">Upcoming</span></div>
                      <div><small>M4 Handover</small><b>₹4.60L</b><br /><span className="chip">Upcoming</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="tcopy">
                {product.screens.slice(0, 4).map((s, i) => (
                  <div key={i} className={i === 0 ? "on" : undefined} data-copy={i}>
                    <span className="kicker">{s.tab}</span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Island>
        </div>
      </section>

      {/* ============ SAVINGS CALCULATOR ============ */}
      <section className="sec" id="savings" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Island name="calc" className="calc rv">
            <div data-calc-cfg data-time={assume.timePct} data-leak={assume.leakPct} data-hourly={assume.hourly} hidden />
            <div className="calc-in">
              <span className="kicker">Savings calculator</span>
              <h2>{calculator.heading}</h2>
              <p className="lede">{calculator.lede}</p>
              <div className="presets" role="group" aria-label="Start from a typical business">
                <span>Start from</span>
                {PRESETS.map((p, i) => <button key={p.id} type="button" data-preset={p.id} aria-pressed={i === 0}>{p.label}</button>)}
                <button type="button" data-preset="custom" aria-pressed={false} tabIndex={-1} className="custom">Custom</button>
              </div>
              <div className="sliders">
                {SLIDERS.map((sl) => (
                  <div className="sl" key={sl.key}>
                    <div className="sl-h"><label htmlFor={`sl-${sl.key}`}>{sl.label}</label><output data-out={`v-${sl.key}`} htmlFor={`sl-${sl.key}`}>{sl.fmt(sl.def)}</output></div>
                    <input id={`sl-${sl.key}`} name={sl.key} type="range" min={sl.min} max={sl.max} step={sl.step} defaultValue={sl.def} style={{ ["--fill" as string]: `${((sl.def - sl.min) / (sl.max - sl.min)) * 100}%` }} />
                    <div className="sl-ends" aria-hidden="true"><span>{sl.ends[0]}</span><span>{sl.ends[1]}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="calc-out" aria-live="polite">
              <div className="co-top">
                <small data-out="lead">You could get back, every year</small>
                <div className="seg" role="group" aria-label="Time period">
                  {PERIODS.map((p) => <button key={p.id} type="button" data-period={p.id} aria-pressed={p.id === "year"}>{p.label}</button>)}
                  <button type="button" data-period="custom" aria-pressed={false} aria-controls="calc-custom">Custom</button>
                </div>
              </div>
              <div className="co-custom" id="calc-custom" data-custom hidden>
                <label htmlFor="calc-n">Show savings over</label>
                <input id="calc-n" data-custom-n type="number" inputMode="decimal" min={1} max={240} step={1} defaultValue={18} />
                <label htmlFor="calc-u" className="hp">Unit</label>
                <select id="calc-u" data-custom-u defaultValue="months"><option value="months">months</option><option value="years">years</option></select>
              </div>
              <b className="calc-total" data-out="total">{inr(calc0.total)}</b>
              <p className="co-sub"><span data-out="pct">{calc0.pctOfTurnover.toFixed(1)}%</span> of turnover, back in your business</p>

              <div className="co-chart">
                <div className="co-legend">
                  <span><i className="k-today" />Cost of re-typing today <b data-out="costToday">{inr(calc0.costToday)}</b></span>
                  <span><i className="k-after" />On one ledger <b data-out="costAfter">{inr(calc0.costAfter)}</b></span>
                </div>
                <svg viewBox="0 0 320 132" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="gapFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F6A25C" stopOpacity=".42" /><stop offset="1" stopColor="#F6A25C" stopOpacity=".04" /></linearGradient>
                  </defs>
                  {[33, 66, 99].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} className="gl" />)}
                  <path data-svg="gap" d={chart0.gap} fill="url(#gapFill)" />
                  <path data-svg="today" d={chart0.today} className="ln-today" />
                  <path data-svg="after" d={chart0.after} className="ln-after" />
                  <circle data-svg="dotToday" cx="320" cy={chart0.endToday[1].toFixed(1)} r="3.5" className="dt-today" />
                  <circle data-svg="dotAfter" cx="320" cy={chart0.endAfter[1].toFixed(1)} r="4" className="dt-after" />
                </svg>
                <div className="co-axis" aria-hidden="true"><span>Today</span><span data-out="axis">12 months</span></div>
              </div>

              <div className="co-split">
                <svg viewBox="0 0 84 84" className="co-ring" aria-hidden="true">
                  <circle cx="42" cy="42" r="34" className="r-margin" />
                  <circle data-svg="ring" cx="42" cy="42" r="34" className="r-time" strokeDasharray={ringDash(calc0.timeValue, calc0.total)} />
                </svg>
                <div className="co-rows">
                  <div><i className="k-time" /><span>Estimating time back</span><b data-out="hours">{calc0.hoursBack.toLocaleString("en-IN")} hrs</b><em data-out="timeValue">{inr(calc0.timeValue)}</em></div>
                  <div><i className="k-margin" /><span>Margin recovered</span><b data-out="margin">{inr(calc0.marginBack)}</b><em>caught on one ledger</em></div>
                </div>
              </div>

              <div className="co-foot">
                <details className="assume">
                  <summary>How we calculate</summary>
                  <ul>
                    <li>Estimates and BOQ revisions take {assume.timePct}% less time</li>
                    <li>{assume.leakPct}% of margin leakage is caught</li>
                    <li>Estimator time costs ₹{assume.hourly.toLocaleString("en-IN")} an hour</li>
                  </ul>
                  <p>{calculator.note}</p>
                </details>
                <a className="btn co-cta" href="#waitlist">Join the waitlist <span aria-hidden="true">→</span></a>
              </div>
            </div>
          </Island>
        </div>
      </section>

      {/* ============ WHO ============ */}
      <section className="sec" id="who" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head rv">
            <span className="kicker">Who it&apos;s for</span>
            <h2>{who.heading}</h2>
            <p className="lede">{who.lede}</p>
          </div>
          <div className="who-grid">
            {who.items.map((w, i) => (
              <article className="who-card rv" key={w.title} style={{ transitionDelay: `${i * 70}ms` }}>
                <div className="art" aria-hidden="true"><WhoArt i={i} /></div>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
                <ul>{w.points.map((p) => <li key={p}>{I.check}{p}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="sec" id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap faq">
          <div className="faq-side rv">
            <span className="kicker">FAQ</span>
            <h2>{faq.heading}</h2>
            <p>{faq.intro}</p>
            <div className="mail"><span>{settings.contactEmail}</span><CopyButton text={settings.contactEmail} /></div>
          </div>
          <div className="qa">
            {faq.items.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}<span className="pm" aria-hidden="true" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="cta-wrap" id="waitlist">
        <div className="wrap">
          <div className="cta rv">
            <div className="skyline" aria-hidden="true"><Skyline /></div>
            <div className="cta-inner">
              <span className="kicker">Founding members</span>
              <h2>{cta.heading}</h2>
              <p className="lede">{cta.lede}</p>
              <WaitlistForm source="cta" withRole centered />
            </div>
          </div>
        </div>
      </section>
    </Island>
  );
}

/** Split the hero title into up to three balanced lines for the line-by-line reveal. */
function splitTitle(t: string): string[] {
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 6) return [t];
  const target = t.length / 3;
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > target * 1.08 && out.length < 2) { out.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

function num(s: string, def: number, min: number, max: number): number {
  const n = Number(String(s).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && String(s).trim() !== "" ? Math.min(max, Math.max(min, n)) : def;
}
