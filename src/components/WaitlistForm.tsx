"use client";
import { useEffect, useId, useState } from "react";

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const ROLES = ["Contractor", "Builder", "Owner", "Interior designer", "Other"];

export function WaitlistForm({ note = "", source, withRole = false, centered = false, joined = false }: { note?: string; source: string; withRole?: boolean; centered?: boolean; joined?: boolean }) {
  const id = useId();
  const [state, setState] = useState<{ kind: "idle" | "busy" | "ok" | "err"; msg: string }>({ kind: "idle", msg: note });
  const [spot, setSpot] = useState<Spot | null>(null);

  // Remember a ?ref= code for this visit, so it still counts if they join from another page.
  useEffect(() => {
    try {
      const r = new URLSearchParams(location.search).get("ref");
      if (r && /^[a-z2-9]{7}$/.test(r)) sessionStorage.setItem("sk_ref", r);
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    if (!EMAIL.test(email)) {
      setState({ kind: "err", msg: "Enter a valid work email, like name@company.com." });
      return;
    }
    setState({ kind: "busy", msg: "Adding you to the list…" });
    let ref = "";
    try { ref = new URLSearchParams(location.search).get("ref") || sessionStorage.getItem("sk_ref") || ""; } catch {}
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: fd.get("role") || "", company_site: fd.get("company_site") || "", source, ref }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState({ kind: "ok", msg: data.message || `You're on the list. We'll write to ${email} when your batch opens.` });
        (e.target as HTMLFormElement).reset();
        if (data.code && data.position) setSpot({ position: data.position, total: data.total, code: data.code, perReferral: data.perReferral || 5 });
      } else setState({ kind: "err", msg: data.error || "That didn't go through. Try again in a moment." });
    } catch {
      setState({ kind: "err", msg: "That didn't go through. Check your connection and try again." });
    }
  }

  const noteEl = (
    <p className={`form-note${state.kind === "ok" ? " ok" : ""}`} role="status" aria-live="polite" style={centered ? { width: "100%", textAlign: "center" } : undefined}>
      {state.msg}
    </p>
  );
  const form = (
    <form className={joined ? "joined" : "waitlist-inline"} onSubmit={onSubmit} noValidate>
      <label htmlFor={`${id}-email`} className="hp">Work email</label>
      <input className="field" id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" placeholder="Your work email" required maxLength={254} aria-invalid={state.kind === "err" || undefined} />
      {withRole && (
        <>
          <label htmlFor={`${id}-role`} className="hp">Your role</label>
          <select className="field" id={`${id}-role`} name="role" defaultValue="" style={{ flex: "0 1 190px" }}>
            <option value="">I'm a… (optional)</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </>
      )}
      <input className="hp" type="text" name="company_site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button className="btn btn-solid" type="submit" disabled={state.kind === "busy"}>
        {state.kind === "busy" ? "Joining…" : "Join the waitlist"}
      </button>
      {!joined && noteEl}
    </form>
  );
  if (spot) return <SpotCard spot={spot} msg={state.msg} centered={centered || joined} />;
  return joined ? <div className="joined-wrap">{form}{noteEl}</div> : form;
}

type Spot = { position: number; total: number; code: string; perReferral: number };

function SpotCard({ spot, msg, centered }: { spot: Spot; msg: string; centered: boolean }) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/?ref=${spot.code}`;
  const pitch = "I just joined the Shellkore waitlist, the operating system for construction and interiors teams. Join with my link:";
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  return (
    <div className={`spot${centered ? " center" : ""}`} role="status" aria-live="polite">
      <div className="spot-top">
        <div><small>Your place in line</small><b>#{spot.position.toLocaleString("en-IN")}</b></div>
        <p>{msg} Move up <strong>{spot.perReferral} spots</strong> for every teammate or peer who joins with your link.</p>
      </div>
      <div className="spot-link">
        <label className="hp" htmlFor="spot-link">Your referral link</label>
        <input id="spot-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-solid btn-sm" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
      </div>
      <div className="spot-share">
        <a href={`https://wa.me/?text=${encodeURIComponent(`${pitch} ${link}`)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">Share on LinkedIn</a>
        <a href={`mailto:?subject=${encodeURIComponent("Shellkore early access")}&body=${encodeURIComponent(`${pitch}\n${link}`)}`}>Email it</a>
      </div>
    </div>
  );
}
