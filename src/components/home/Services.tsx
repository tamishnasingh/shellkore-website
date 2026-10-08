/** Client-facing sections: promises, one point of contact, everyone gains, crews and visits, maintenance. */
import type { Content } from "@/lib/defaults";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const Ic = {
  flow: <svg viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="6" height="7" rx="1.5" /><rect x="15" y="13" width="6" height="7" rx="1.5" /><path d="M9 7.5h4a3 3 0 0 1 3 3V13" /><path d="m14 11 2 2 2-2" /></svg>,
  person: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /><path d="M17.5 4.5 19 3M19.5 7h2" /></svg>,
  shield: <svg viewBox="0 0 24 24" {...S}><path d="M12 3 5 6v5.5c0 4.3 2.9 7.8 7 9.5 4.1-1.7 7-5.2 7-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>,
  door: <svg viewBox="0 0 24 24" {...S}><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" /><path d="M3.5 21h17" /><circle cx="14.5" cy="12.5" r=".9" fill="currentColor" /></svg>,
  wrench: <svg viewBox="0 0 24 24" {...S}><path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z" /><path d="M14.5 6.5 17 4a4 4 0 0 1 3 3l-2.5 2.5" /></svg>,
  boq: <svg viewBox="0 0 24 24" {...S}><rect x="4.5" y="3" width="15" height="18" rx="2" /><path d="M8 7.5h8M8 11.5h8M8 15.5h4.5" /></svg>,
  check: <svg viewBox="0 0 16 16" {...S} strokeWidth={2}><path d="m3.5 8.5 3 3 6-7" /></svg>,
  star: <svg viewBox="0 0 16 16" fill="currentColor"><path d="m8 1.6 1.9 4 4.3.5-3.2 3 .9 4.3L8 11.2l-3.9 2.2.9-4.3-3.2-3 4.3-.5z" /></svg>,
  // roles
  architect: <svg viewBox="0 0 24 24" {...S}><path d="M12 3 3 21M12 3l9 18M6.5 14h11" /></svg>,
  designer: <svg viewBox="0 0 24 24" {...S}><path d="M4 20c4-1 4-5 8-5s4 4 8 5" /><circle cx="12" cy="8" r="4" /></svg>,
  contractor: <svg viewBox="0 0 24 24" {...S}><path d="M4 15a8 8 0 0 1 16 0" /><path d="M2.5 15h19v2.5h-19z" /><path d="M10 7V4.5h4V7" /></svg>,
  crew: <svg viewBox="0 0 24 24" {...S}><circle cx="8" cy="9" r="3" /><circle cx="16.5" cy="9.5" r="2.5" /><path d="M2.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M14 15.3c2.6-.5 5 .8 5.7 3.7" /></svg>,
  vendor: <svg viewBox="0 0 24 24" {...S}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></svg>,
  client: <svg viewBox="0 0 24 24" {...S}><path d="M4 11 12 4l8 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></svg>,
  // services
  plumb: <svg viewBox="0 0 24 24" {...S}><path d="M5 4v5a3 3 0 0 0 3 3h8a3 3 0 0 1 3 3v1" /><path d="M3 4h4M17 16h4" /><path d="M19 19.5c0 1-.9 1.5-1.5 1.5S16 20.5 16 19.5c0-.9 1.5-2.5 1.5-2.5s1.5 1.6 1.5 2.5z" /></svg>,
  bolt: <svg viewBox="0 0 24 24" {...S}><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" /></svg>,
  drop: <svg viewBox="0 0 24 24" {...S}><path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z" /><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" /></svg>,
  roller: <svg viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="14" height="5.5" rx="1.5" /><path d="M17 5.75h3V11h-8v3" /><rect x="10.5" y="14" width="3" height="7" rx="1" /></svg>,
  hammer: <svg viewBox="0 0 24 24" {...S}><path d="m14 7 3-3 4 4-3 3" /><path d="m14 7-3.5 3.5 3 3L17 10" /><path d="m11.5 12.5-8 8" /></svg>,
  ac: <svg viewBox="0 0 24 24" {...S}><rect x="3" y="5" width="18" height="8" rx="2" /><path d="M6 10h12M8 16.5c0 1.2-1 2-1 3M12 16.5c0 1.2-1 2-1 3M16 16.5c0 1.2-1 2-1 3" /></svg>,
};
const PROMISE_ICONS = [Ic.flow, Ic.person, Ic.shield, Ic.door, Ic.wrench, Ic.boq];
const ROLE_ICONS = [Ic.architect, Ic.designer, Ic.contractor, Ic.crew, Ic.vendor, Ic.wrench];
const ECO_ICONS = [Ic.client, Ic.crew, Ic.architect, Ic.designer, Ic.vendor];
const SERVICE_ICONS = [Ic.plumb, Ic.bolt, Ic.drop, Ic.roller, Ic.hammer, Ic.ac];

export function Promises({ c }: { c: Content["promise"] }) {
  return (
    <section className="sec pr" id="promise">
      <div className="wrap">
        <div className="sec-head rv">
          <span className="kicker">{c.kicker}</span>
          <h2>{c.heading}</h2>
          <p className="lede">{c.lede}</p>
        </div>
        <ol className="pr-grid rv">
          {c.items.slice(0, 6).map((it, i) => (
            <li key={i} className="pr-card">
              <span className="pr-ic">{PROMISE_ICONS[i % PROMISE_ICONS.length]}</span>
              <span className="pr-n">0{i + 1}</span>
              <h3>{it.title}</h3>
              <p>{it.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ContactHub({ c }: { c: Content["contact"] }) {
  const roles = c.roles.slice(0, 6);
  const at = (i: number) => {
    const a = (-90 + (360 / roles.length) * i) * (Math.PI / 180);
    return { x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38 };
  };
  const [name, role] = c.lead.split("·").map((s) => s.trim());
  return (
    <section className="sec hub-sec" id="one-contact">
      <div className="wrap hub-grid">
        <div className="hub-copy rv">
          <span className="kicker">{c.kicker}</span>
          <h2>{c.heading}</h2>
          <p className="lede">{c.lede}</p>
          <ul className="hub-points">
            {c.points.map((p, i) => <li key={i}><span>{Ic.check}</span>{p}</li>)}
          </ul>
          <a className="btn btn-solid" href="#waitlist">Get your project lead</a>
        </div>
        <div className="hub rv" role="img" aria-label={`One Shellkore project lead coordinating ${roles.join(", ")}.`}>
          <svg className="hub-lines" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
            <circle cx="50" cy="50" r="38" className="hub-orbit" />
            {roles.map((_, i) => { const p = at(i); return <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} className="hub-ln" style={{ ["--i" as string]: i }} pathLength={1} />; })}
          </svg>
          {roles.map((r, i) => {
            const p = at(i);
            return <span key={r} className="hub-node" style={{ left: `${p.x}%`, top: `${p.y}%`, ["--i" as string]: i }}><i>{ROLE_ICONS[i % ROLE_ICONS.length]}</i>{r}</span>;
          })}
          <div className="hub-lead">
            <span className="hub-av">{(name || "A").charAt(0)}<i /></span>
            <b>{name}</b>
            <small>{role || "Your project lead"}</small>
          </div>
          <div className="hub-chat" aria-hidden="true">
            <p className="me">Can we move the kitchen window?</p>
            <p>Done. Revised BOQ <b>+₹18,400</b> sent for your approval.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Ecosystem({ c }: { c: Content["ecosystem"] }) {
  return (
    <section className="sec eg" id="everyone">
      <div className="wrap">
        <div className="sec-head rv">
          <span className="kicker">{c.kicker}</span>
          <h2>{c.heading}</h2>
          <p className="lede">{c.lede}</p>
        </div>
        <div className="eg-row rv">
          <div className="eg-core" aria-hidden="true"><span>Shellkore</span></div>
          {c.items.slice(0, 5).map((it, i) => (
            <article key={i} className="eg-card" style={{ ["--i" as string]: i }}>
              <span className="eg-ic">{ECO_ICONS[i % ECO_ICONS.length]}</span>
              <small>{it.who}</small>
              <h3>{it.gain}</h3>
              <ul>{it.points.split("|").filter(Boolean).map((p, j) => <li key={j}>{Ic.check}{p.trim()}</li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Crews({ c }: { c: Content["crews"] }) {
  const days = [["Sat", "12"], ["Sun", "13"], ["Mon", "14"], ["Tue", "15"]];
  const times = ["10:00", "12:30", "16:00"];
  return (
    <section className="sec crew-sec" id="crews">
      <div className="wrap">
        <div className="sec-head rv">
          <span className="kicker">{c.kicker}</span>
          <h2>{c.heading}</h2>
          <p className="lede">{c.lede}</p>
        </div>
        <div className="crew-grid rv">
          <article className="crew-card">
            <h3>Vetted before they set foot on site</h3>
            <ol className="crew-steps">
              {c.vetting.map((v, i) => <li key={i}><span>{Ic.check}</span>{v}</li>)}
            </ol>
            <div className="crew-profile" aria-label="Sample worker profile">
              <span className="crew-av">RK</span>
              <div><b>Ramesh K.</b><small>Mason · 14 years</small></div>
              <span className="crew-rate"><b>{Ic.star}4.9</b><small>62 jobs</small></span>
              <div className="crew-tags"><i>ID verified</i><i>Skill tested</i><i>Supervised start</i></div>
              <em>Sample profile</em>
            </div>
          </article>
          <article className="crew-card visit-card">
            <h3>{c.visitTitle}</h3>
            <p>{c.visitBody}</p>
            <form className="visit" aria-label="Pick a visit slot">
              <div className="visit-days" role="radiogroup" aria-label="Day">
                {days.map(([d, n], i) => <label key={d}><input type="radio" name="vday" defaultChecked={i === 0} /><span><small>{d}</small><b>{n}</b></span></label>)}
              </div>
              <div className="visit-times" role="radiogroup" aria-label="Time">
                {times.map((t, i) => <label key={t}><input type="radio" name="vtime" defaultChecked={i === 1} /><span>{t}</span></label>)}
              </div>
              <ul className="visit-inc">
                <li>{Ic.shield}Safety gear ready</li><li>{Ic.person}Supervisor walkthrough</li><li>{Ic.boq}Visit report with photos</li>
              </ul>
              <a className="btn btn-solid" href="#waitlist">Book a site visit</a>
            </form>
          </article>
        </div>
      </div>
    </section>
  );
}

export function Maintenance({ c }: { c: Content["maintenance"] }) {
  return (
    <section className="sec mt-sec" id="maintenance">
      <div className="wrap mt-grid">
        <div className="mt-copy rv">
          <span className="kicker">{c.kicker}</span>
          <h2>{c.heading}</h2>
          <p className="lede">{c.lede}</p>
          <ul className="mt-services">
            {c.services.slice(0, 6).map((s, i) => (
              <li key={i}><span>{SERVICE_ICONS[i % SERVICE_ICONS.length]}</span><b>{s.title}</b><small>{s.body}</small></li>
            ))}
          </ul>
        </div>
        <div className="mt-ticket rv" role="img" aria-label="A sample maintenance request tracked from report to fix.">
          <div className="mt-head"><span className="mt-tag">Request #SR-2048</span><span className="mt-live"><i />Resolved</span></div>
          <h3>Leak under the kitchen sink</h3>
          <small className="mt-where">Flat 402, Lakeside Tower B · Plumbing</small>
          <ol className="mt-steps">
            <li><b>Raised in the app</b><small>9:12 am · with 2 photos</small></li>
            <li><b>Plumber assigned</b><small>9:20 am · Suresh, 11 yrs</small></li>
            <li><b>On site</b><small>10:40 am</small></li>
            <li><b>Fixed, photo proof shared</b><small>11:05 am · trap and seal replaced</small></li>
          </ol>
          <div className="mt-rate"><span>How was the fix?</span><span className="mt-stars">{Ic.star}{Ic.star}{Ic.star}{Ic.star}{Ic.star}</span></div>
          <div className="mt-check"><b>Annual home health check</b><small>Plumbing, electrical, seepage and safety, once a year</small></div>
        </div>
      </div>
    </section>
  );
}
