/**
 * Email through Resend's HTTP API. Everything here is optional: with no RESEND_API_KEY or
 * NOTIFY_FROM set, nothing is sent and the site works the same.
 *   RESEND_API_KEY  API key from resend.com
 *   NOTIFY_FROM     verified sender, e.g. "Shellkore <hello@shellkore.com>"
 *   NOTIFY_EMAIL    team inbox(es) for alerts, comma separated
 */
import { SPOTS_PER_REFERRAL, refLink, unsubLink, siteUrl, type Spot } from "./referral";

type Mail = { to: string[]; subject: string; text: string; html?: string; replyTo?: string; headers?: Record<string, string> };

async function send(m: Mail) {
  const key = process.env.RESEND_API_KEY, from = process.env.NOTIFY_FROM;
  if (!key || !from || m.to.length === 0) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: m.to, subject: m.subject, text: m.text, html: m.html, reply_to: m.replyTo, headers: m.headers }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

const team = () => (process.env.NOTIFY_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Alert to the team for each new waitlist signup. */
export function notifySignup(email: string, role: string, source: string, referredBy: string | null) {
  return send({
    to: team(),
    subject: `New Shellkore waitlist signup: ${email}`,
    text: `Email: ${email}\nRole: ${role || "not given"}\nSigned up from: ${source}${referredBy ? `\nReferred by code: ${referredBy}` : ""}\n\nSee everyone at ${siteUrl()}/admin/waitlist`,
  });
}

/** Confirmation to the person who joined: their place in line, their link, and a way out. */
export function sendWelcome(email: string, spot: Spot, again = false) {
  const link = refLink(spot.code), out = unsubLink(email);
  const lead = again ? "You're already on the Shellkore waitlist. Here's where you stand." : "You're on the Shellkore waitlist. Thanks for joining early.";
  const text = `${lead}

Your place in line: #${spot.position}

Every teammate or peer who joins with your link moves you up ${SPOTS_PER_REFERRAL} spots:
${link}

We're onboarding construction and interiors teams in batches. Founding members get early access and founding-member pricing. We'll write when your batch opens.

The Shellkore team

Don't want these emails? Remove yourself: ${out}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16150F;max-width:520px;margin:0 auto;padding:24px">
<p style="font-size:15px;line-height:1.6">${esc(lead)}</p>
<div style="margin:20px 0;padding:20px;border-radius:14px;background:#FDF3EA;border:1px solid #F6D9BF">
<div style="font-size:13px;color:#6C6860">Your place in line</div>
<div style="font-size:40px;font-weight:700;letter-spacing:-1px">#${spot.position}</div>
<div style="font-size:13px;color:#6C6860">${spot.referrals} referral${spot.referrals === 1 ? "" : "s"} so far</div></div>
<p style="font-size:15px;line-height:1.6">Every teammate or peer who joins with your link moves you up <b>${SPOTS_PER_REFERRAL} spots</b>:</p>
<p><a href="${esc(link)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#16150F;color:#fff;text-decoration:none;font-size:14px">${esc(link.replace(/^https?:\/\//, ""))}</a></p>
<p style="font-size:15px;line-height:1.6">We're onboarding construction and interiors teams in batches. Founding members get early access and founding-member pricing.</p>
<p style="font-size:15px">The Shellkore team</p>
<p style="font-size:12px;color:#9A958C;margin-top:28px"><a href="${esc(out)}" style="color:#9A958C">Remove me from the waitlist</a></p></div>`;
  return send({
    to: [email],
    subject: again ? `Your Shellkore waitlist spot: #${spot.position}` : `You're #${spot.position} on the Shellkore waitlist`,
    text, html,
    headers: { "List-Unsubscribe": `<${out}>` },
  });
}
