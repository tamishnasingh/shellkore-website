/**
 * Lead to cash, as one job moving through six documents. The section is tall; the inner
 * frame is sticky, and scroll position picks the stage. Each stage shows the document Shellkore
 * produces, the request that produced it, and the job's ledger growing one entry at a time.
 */
const MARK = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="27" height="27" rx="7" stroke="currentColor" stroke-width="2.5"/><rect x="11" y="11" width="10" height="10" rx="2.5" fill="currentColor"/></svg>`;

const ASKS = [
  "Log Rohan's enquiry as a lead",
  "Price the site photos on our rate card",
  "Send EST-2291 to Rohan on WhatsApp",
  "Raise POs for the carpentry and flooring lines",
  "How is Prestige Lakeside doing this week?",
  "What's the margin on this job?",
];
const LEDGER = ["LD-1042", "EST-2291", "Approved", "PO-7781", "Week 4", "INV-0447"];

const est: [string, number][] = [["Carpentry and joinery", 820000], ["Flooring", 315000], ["False ceiling", 210000], ["Painting", 185000], ["Plumbing and sanitary", 170000], ["Electrical", 140000]];
const lakh = (n: number) => "₹" + (n / 100000).toFixed(2).replace(/\.?0+$/, "") + "L";

const PANES = [
  `<div class="msg-in"><small>New enquiry, by phone</small>Full interiors for our 3BHK at Prestige Lakeside, Tower B. We'd like to move in by March. Budget is around 18 to 20 lakh.</div>
   <div class="made"><span class="tag hl">Lead LD-1042 created</span></div>
   <dl class="kv" style="margin-top:16px"><dt>Client</dt><dd>Rohan Kulkarni</dd><dt>Site</dt><dd>Prestige Lakeside, Tower B, 1204</dd><dt>Scope</dt><dd>3BHK, full interiors</dd><dt>Owner</dt><dd>Arjun</dd><dt>Status</dt><dd>Qualified</dd></dl>`,
  `<div class="bars">${est.map(([k, v], i) => `<div class="bar" style="--i:${i}"><span>${k}</span><span class="tr"><i style="--w:${((v / 820000) * 100).toFixed(1)}%"></i></span><span class="v">${lakh(v)}</span></div>`).join("")}</div>
   <div class="total-row"><span>EST-2291, 42 lines priced from 14 photos</span><b>₹18,40,000</b></div>`,
  `<div class="chat"><div class="bub">Hi Rohan, here is the estimate with the kitchen upgrade you asked for.<div class="doc"><div><b>EST-2291</b><br><span>3BHK interiors, 42 lines</span></div><b>₹18,40,000</b></div><div class="btns"><span>Approve</span><span>Request changes</span></div></div>
   <div class="bub me">Approved. Go ahead with BWP ply for the kitchen.</div></div>
   <div class="stamp">APPROVED<small>11:42, synced to the job</small></div>`,
  `<div class="po"><b>PO-7781</b><span>Kaveri Ply &amp; Laminates</span><span class="v">₹2,86,000</span><span class="s ok">Delivered</span><small>BWP ply and laminates, BOQ lines 12–19</small></div>
   <div class="po"><b>PO-7782</b><span>Bharat Tile Depot</span><span class="v">₹1,18,900</span><span class="s">In transit</span><small>Vitrified 800×800, BOQ line 21</small></div>
   <div class="po"><b>PO-7783</b><span>Metro Electricals</span><span class="v">₹64,500</span><span class="s">Approved</span><small>Wiring and switches, BOQ lines 30–36</small></div>
   <div class="total-row"><span>Committed against the estimate</span><b>₹4,69,400</b></div>`,
  `<div class="weeks">${Array.from({ length: 11 }, (_, i) => `<i class="${i < 3 ? "d" : i === 3 ? "c" : ""}"></i>`).join("")}</div>
   <div class="weeks-l"><span>Week 1</span><span>Week 4 of 11, on track</span><span>Handover</span></div>
   <div class="ups"><div><b>60%</b><small>Carpentry done</small></div><div><b>2</b><small>Crews on site</small></div><div><b>38</b><small>Site photos logged</small></div></div>`,
  `<div class="pl"><div class="big"><b>21.7%</b><small>Projected margin, ₹4.0L on ₹18.4L</small></div>
   <div class="bars">
     ${[["Materials", 8.2, 6.1], ["Labour", 3.6, 2.4], ["Subcontract", 2.1, 1.1], ["Overheads", 0.5, 0.26]].map(([k, b, s], i) => `<div class="bar" style="--i:${i}"><span>${k}</span><span class="tr"><i class="budget" style="--w:${((+b / 8.2) * 100).toFixed(1)}%"></i><i style="--w:${((+s / 8.2) * 100).toFixed(1)}%"></i></span><span class="v">${s} of ${b}L</span></div>`).join("")}
   </div></div>
   <div class="paid"><span class="tag hl">INV-0447 paid, ₹4,60,000</span><span style="color:var(--graphite)">Filled bar is spent, outline is budget</span></div>`,
];

export function mount(root: HTMLElement): () => void {
  const track = root.querySelector<HTMLElement>(".journey-track")!;
  const stages = Array.from(root.querySelectorAll<HTMLLIElement>(".stages li"));
  const list = root.querySelector<HTMLElement>(".stages")!;
  const now = root.querySelector<HTMLElement>(".stage-now");
  const host = root.querySelector<HTMLElement>("[data-journey-visual]")!;
  const N = stages.length || 6;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  host.innerHTML = `<div class="job" aria-hidden="true">
    <div class="job-head"><b>Prestige Lakeside, Tower B</b><span>3BHK interiors for Rohan Kulkarni</span></div>
    <div class="ask-line">${MARK}<span class="typed"></span><span class="caret"></span></div>
    <div class="panes">${PANES.slice(0, N).map((p) => `<div class="pane">${p}</div>`).join("")}</div>
    <div class="ledger"><span class="ledger-l">Job ledger</span>${LEDGER.slice(0, N).map((l, i) => `${i ? "<i></i>" : ""}<span>${l}</span>`).join("")}</div>
  </div>`;
  const panes = Array.from(host.querySelectorAll<HTMLElement>(".pane"));
  const chips = Array.from(host.querySelectorAll<HTMLElement>(".ledger span:not(.ledger-l)"));
  const links = Array.from(host.querySelectorAll<HTMLElement>(".ledger i"));
  const typed = host.querySelector<HTMLElement>(".typed")!;

  let cur = -1, typer = 0;
  const type = (text: string) => {
    clearInterval(typer);
    if (reduce) { typed.textContent = text; return; }
    let n = 0;
    typed.textContent = "";
    typer = window.setInterval(() => { typed.textContent = text.slice(0, ++n); if (n >= text.length) clearInterval(typer); }, 22);
  };
  const setStage = (s: number) => {
    if (s === cur) return;
    cur = s;
    stages.forEach((li, i) => { li.classList.toggle("on", i === s); li.classList.toggle("done", i < s); li.setAttribute("aria-current", i === s ? "step" : "false"); });
    panes.forEach((p, i) => p.classList.toggle("on", i === s));
    chips.forEach((c, i) => { c.classList.toggle("got", i < s); c.classList.toggle("new", i === s); });
    links.forEach((l, i) => l.classList.toggle("got", i < s));
    const chip = chips[s], led = chip?.parentElement;
    if (chip && led) led.scrollLeft = Math.max(0, chip.offsetLeft - led.clientWidth / 2 + chip.offsetWidth / 2);
    if (now) {
      const k = stages[s]?.querySelector(".st-k")?.textContent || "";
      const b = stages[s]?.querySelector(".st-b")?.textContent || "";
      now.innerHTML = "";
      const bb = document.createElement("b"); bb.textContent = k;
      const sp = document.createElement("span"); sp.textContent = b;
      now.append(bb, sp);
    }
    type(ASKS[s] || "");
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const r = track.getBoundingClientRect();
    const span = r.height - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
    list.style.setProperty("--p", String(p));
    setStage(Math.min(N - 1, Math.floor(p * N * 0.999)));
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  // clicking a stage scrolls to it
  const onClick = (e: Event) => {
    const li = (e.target as Element).closest("li");
    const i = li ? stages.indexOf(li as HTMLLIElement) : -1;
    if (i < 0) return;
    const r = track.getBoundingClientRect();
    const top = scrollY + r.top + ((r.height - innerHeight) * (i + 0.5)) / N;
    scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };
  list.addEventListener("click", onClick);
  update();
  if (cur < 0) setStage(0);

  return () => {
    clearInterval(typer);
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", onScroll);
    list.removeEventListener("click", onClick);
  };
}
