import { Island } from "@/components/islands/Island";
import { boq, tiles, paint, emi, rupees, TYPES, FINISHES, CITIES, TILE_SIZES } from "@/lib/tools";

const B0 = { type: "build" as const, area: 2000, finish: "premium" as const, city: "metro" as const };

const Icon = {
  boq: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="2.5" width="13" height="15" rx="2" /><path d="M7 6.5h6M7 10h6M7 13.5h3.5" /></svg>,
  tiles: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="11" y="3" width="6" height="6" rx="1" /><rect x="3" y="11" width="6" height="6" rx="1" /><rect x="11" y="11" width="6" height="6" rx="1" /></svg>,
  paint: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="12" height="5" rx="1.5" /><path d="M15 5.5h2v4H10v2.5" /><rect x="8.6" y="12" width="2.8" height="5.5" rx="1" /></svg>,
  emi: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 10 4l7 5.5" /><path d="M5 8.2V16h10V8.2" /><path d="M8.3 11h3.4M8.3 13.2h3.4M10 11c1.3 0 1.3 2.2 0 2.2" /></svg>,
};

/** BOQ head rows, also rebuilt in the browser by the toolkit island with the same markup. */
function Lines({ r }: { r: ReturnType<typeof boq> }) {
  const max = Math.max(...r.lines.map((l) => l.share));
  return (
    <>
      {r.lines.map((l) => (
        <li key={l.name}><span>{l.name}</span><i style={{ ["--w" as string]: `${((l.share / max) * 100).toFixed(1)}%` }} /><b>{rupees(l.amount)}</b></li>
      ))}
    </>
  );
}

export function Toolkit({ kicker, heading, lede, note }: { kicker: string; heading: string; lede: string; note: string }) {
  const r = boq(B0);
  const t = tiles(14, 12, "800x800", 10);
  const p = paint(14, 12, 10, 1, 2, 2, false);
  const e = emi(6000000, 8.5, 20);
  return (
    <section className="sec tk" id="tools">
      <div className="wrap">
        <div className="sec-head rv">
          <span className="kicker">{kicker}</span>
          <h2>{heading}</h2>
          <p className="lede">{lede}</p>
        </div>
        <Island name="toolkit" className="tk-box rv">
          <div className="tk-tabs" role="tablist" aria-label="Tools">
            {[["boq", "BOQ estimator"], ["tiles", "Tiles"], ["paint", "Paint"], ["emi", "Home-loan EMI"]].map(([id, label], i) => (
              <button key={id} type="button" role="tab" id={`tk-tab-${id}`} aria-controls={`tk-${id}`} aria-selected={i === 0} data-tab={id}>
                {Icon[id as keyof typeof Icon]}<span>{label}</span>
              </button>
            ))}
          </div>

          {/* ---------- BOQ estimator ---------- */}
          <div className="tk-panel tk-boq" id="tk-boq" role="tabpanel" aria-labelledby="tk-tab-boq" data-panel="boq">
            <form className="tk-in" aria-label="BOQ inputs">
              <fieldset>
                <legend>Project</legend>
                <div className="tk-seg tk-seg-2">
                  {TYPES.map((x) => <button key={x.id} type="button" data-type={x.id} aria-pressed={x.id === B0.type}>{x.label}</button>)}
                </div>
              </fieldset>
              <label className="tk-f">
                <span className="tk-l">Area <small data-o="areaHint">{TYPES[0].hint}</small></span>
                <span className="tk-area"><input type="number" name="areaN" min={100} max={100000} step={50} defaultValue={B0.area} inputMode="numeric" aria-label="Area in square feet" /><em>sq ft</em></span>
                <input type="range" name="area" min={300} max={10000} step={50} defaultValue={B0.area} aria-label="Area slider" />
              </label>
              <fieldset>
                <legend>Finish</legend>
                <div className="tk-seg">
                  {FINISHES.map((x) => <button key={x.id} type="button" data-finish={x.id} aria-pressed={x.id === B0.finish}>{x.label}</button>)}
                </div>
              </fieldset>
              <label className="tk-f">
                <span className="tk-l">Location</span>
                <select name="city" defaultValue={B0.city}>{CITIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
              </label>
            </form>

            <div className="tk-out" aria-live="polite">
              <div className="tk-total">
                <small>Estimated project cost</small>
                <b data-o="total">{rupees(r.total)}</b>
                <span data-o="range">{rupees(r.low)} – {rupees(r.high)} · ₹{r.perSqft.toLocaleString("en-IN")}/sq ft</span>
              </div>
              <div className="tk-kpis">
                <span><small>Timeline</small><b data-o="weeks">{r.weeks} weeks</b></span>
                <span><small>BOQ heads</small><b data-o="heads">{r.lines.length}</b></span>
                <span><small>Rate</small><b data-o="rate">₹{r.perSqft.toLocaleString("en-IN")}/sq ft</b></span>
              </div>
              <div className="tk-blk">
                <h4>BOQ breakdown</h4>
                <ul className="tk-lines" data-o="lines"><Lines r={r} /></ul>
              </div>
              <div className="tk-blk">
                <h4>Payment milestones</h4>
                <div className="tk-ms" data-o="milestones">
                  {r.milestones.map((m, i) => <span key={m.name} style={{ ["--s" as string]: m.share, ["--i" as string]: i }}><b>{m.share}%</b><small>{m.name}</small></span>)}
                </div>
              </div>
              <div className="tk-blk">
                <h4 data-o="matTitle">Key materials</h4>
                <div className="tk-mat" data-o="materials">
                  {r.materials.map((m) => <span key={m.name}><small>{m.name}</small><b>{m.qty}</b></span>)}
                </div>
              </div>
              <div className="tk-cta">
                <a className="btn btn-solid" href="#waitlist">Get an exact BOQ from your drawings</a>
                <p>{note}</p>
              </div>
            </div>
          </div>

          {/* ---------- Tiles ---------- */}
          <div className="tk-panel tk-mini" id="tk-tiles" role="tabpanel" aria-labelledby="tk-tab-tiles" data-panel="tiles" hidden>
            <form className="tk-in" aria-label="Tile inputs">
              <div className="tk-row">
                <label className="tk-f"><span className="tk-l">Room length</span><span className="tk-area"><input type="number" name="tl" defaultValue={14} min={1} step={0.5} /><em>ft</em></span></label>
                <label className="tk-f"><span className="tk-l">Room width</span><span className="tk-area"><input type="number" name="tw" defaultValue={12} min={1} step={0.5} /><em>ft</em></span></label>
              </div>
              <label className="tk-f"><span className="tk-l">Tile size</span><select name="ts" defaultValue="800x800">{TILE_SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
              <label className="tk-f"><span className="tk-l">Wastage <small data-o="twv">10%</small></span><input type="range" name="tx" min={5} max={20} step={1} defaultValue={10} /></label>
            </form>
            <div className="tk-out">
              <div className="tk-total"><small>Tiles you need</small><b data-o="tCount">{t.count}</b><span data-o="tBoxes">{t.boxes} boxes · {t.perBox} per box</span></div>
              <div className="tk-kpis">
                <span><small>Floor area</small><b data-o="tArea">{t.area} sq ft</b></span>
                <span><small>Skirting</small><b data-o="tSkirt">{t.skirting} rft</b></span>
              </div>
              <div className="tk-tilegrid" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div>
            </div>
          </div>

          {/* ---------- Paint ---------- */}
          <div className="tk-panel tk-mini" id="tk-paint" role="tabpanel" aria-labelledby="tk-tab-paint" data-panel="paint" hidden>
            <form className="tk-in" aria-label="Paint inputs">
              <div className="tk-row tk-row3">
                <label className="tk-f"><span className="tk-l">Length</span><span className="tk-area"><input type="number" name="pl" defaultValue={14} min={1} step={0.5} /><em>ft</em></span></label>
                <label className="tk-f"><span className="tk-l">Width</span><span className="tk-area"><input type="number" name="pw" defaultValue={12} min={1} step={0.5} /><em>ft</em></span></label>
                <label className="tk-f"><span className="tk-l">Height</span><span className="tk-area"><input type="number" name="ph" defaultValue={10} min={7} step={0.5} /><em>ft</em></span></label>
              </div>
              <div className="tk-row tk-row3">
                <label className="tk-f"><span className="tk-l">Doors</span><input type="number" name="pd" defaultValue={1} min={0} max={10} /></label>
                <label className="tk-f"><span className="tk-l">Windows</span><input type="number" name="pn" defaultValue={2} min={0} max={20} /></label>
                <label className="tk-f"><span className="tk-l">Coats</span><select name="pc" defaultValue="2"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
              </div>
              <label className="tk-check"><input type="checkbox" name="pceil" /> Paint the ceiling too</label>
            </form>
            <div className="tk-out">
              <div className="tk-total"><small>Emulsion you need</small><b data-o="pPaint">{p.paintL.toFixed(1)} L</b><span data-o="pArea">{Math.round(p.area)} sq ft to paint</span></div>
              <div className="tk-kpis">
                <span><small>Primer</small><b data-o="pPrimer">{p.primerL.toFixed(1)} L</b></span>
                <span><small>Wall putty</small><b data-o="pPutty">{p.puttyKg.toFixed(1)} kg</b></span>
              </div>
              <div className="tk-swatches" aria-hidden="true">{["#F3EEE6", "#E7D9C4", "#C9D3CF", "#D8C2B4", "#B9C4D0", "#2F3A42"].map((c) => <i key={c} style={{ background: c }} />)}</div>
            </div>
          </div>

          {/* ---------- EMI ---------- */}
          <div className="tk-panel tk-mini" id="tk-emi" role="tabpanel" aria-labelledby="tk-tab-emi" data-panel="emi" hidden>
            <form className="tk-in" aria-label="Loan inputs">
              <label className="tk-f"><span className="tk-l">Loan amount <small data-o="eAmt">{rupees(6000000)}</small></span><input type="range" name="ea" min={500000} max={50000000} step={100000} defaultValue={6000000} /></label>
              <label className="tk-f"><span className="tk-l">Interest rate <small data-o="eRate">8.5%</small></span><input type="range" name="er" min={6} max={14} step={0.05} defaultValue={8.5} /></label>
              <label className="tk-f"><span className="tk-l">Tenure <small data-o="eYrs">20 years</small></span><input type="range" name="ey" min={1} max={30} step={1} defaultValue={20} /></label>
            </form>
            <div className="tk-out">
              <div className="tk-total"><small>Monthly EMI</small><b data-o="eEmi">{rupees(e.emi)}</b><span data-o="eTot">{rupees(e.total)} paid in all</span></div>
              <div className="tk-emi">
                <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="32" className="t" /><circle cx="40" cy="40" r="32" className="v" pathLength={100} strokeDasharray={`${((6000000 / e.total) * 100).toFixed(1)} 100`} data-o="eRing" /></svg>
                <div>
                  <span><i className="p" />Principal <b data-o="eP">{rupees(6000000)}</b></span>
                  <span><i className="q" />Interest <b data-o="eI">{rupees(e.interest)}</b></span>
                </div>
              </div>
            </div>
          </div>
        </Island>
      </div>
    </section>
  );
}
