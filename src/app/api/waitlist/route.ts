import { NextResponse, after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { q } from "@/lib/db";
import { clientIp, hashIp, rateLimit, sameOrigin } from "@/lib/security";
import { notifySignup, sendWelcome } from "@/lib/email";
import { isRefCode, newRefCode, spotFor, SPOTS_PER_REFERRAL } from "@/lib/referral";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  role: z.enum(["", "Contractor", "Builder", "Owner", "Interior designer", "Other"]).optional().default(""),
  company: z.string().trim().max(120).optional().default(""),
  source: z.string().trim().max(40).regex(/^[a-z0-9_-]*$/i).optional().default("site"),
  company_site: z.string().optional().default(""), // honeypot
  ref: z.string().trim().max(20).optional().default(""),
});

export async function POST(req: Request) {
  if (!(await sameOrigin())) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 4000) return NextResponse.json({ error: "Request too large." }, { status: 413 });

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!parsed.success) {
    const emailIssue = parsed.error.issues.some((i) => i.path[0] === "email");
    return NextResponse.json({ error: emailIssue ? "Enter a valid work email, like name@company.com." : "Check your details and try again." }, { status: 400 });
  }
  const { email, role, company, source, company_site, ref } = parsed.data;

  // Bots fill the hidden field; pretend success so they don't retry.
  if (company_site) return NextResponse.json({ ok: true });

  const ipHash = hashIp(await clientIp());
  if (!(await rateLimit(`waitlist:${ipHash}`, 5, 600))) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const ua = ((await headers()).get("user-agent") || "").slice(0, 300);
  // Credit the referrer only if the code is real.
  let referredBy: string | null = null;
  if (isRefCode(ref)) {
    const r = await q<{ ref_code: string }>(`select ref_code from waitlist where ref_code = $1 and email <> $2`, [ref, email]);
    referredBy = r[0]?.ref_code ?? null;
  }
  let isNew = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const rows = await q<{ inserted: boolean }>(
        `insert into waitlist (email, role, company, source, ip_hash, user_agent, ref_code, referred_by)
         values ($1, nullif($2,''), nullif($3,''), $4, $5, $6, $7, $8)
         on conflict (email) do update set role = coalesce(excluded.role, waitlist.role)
         returning (xmax = 0) as inserted`,
        [email, role, company, source, ipHash, ua, newRefCode(), referredBy],
      );
      isNew = Boolean(rows[0]?.inserted);
      break;
    } catch (e) {
      // a referral-code collision (1 in billions): try a new code
      if (attempt === 3 || !/ref_code/.test(String(e))) throw e;
    }
  }
  const spot = await spotFor(email);
  if (spot) after(() => sendWelcome(email, spot, !isNew).catch((e) => console.error("welcome failed", e)));
  if (isNew) after(() => notifySignup(email, role, source, referredBy).catch((e) => console.error("notify failed", e)));

  const mailOn = Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM);
  if (!isNew || !spot) {
    // Already on the list: the details go to their inbox, not to whoever typed the address.
    return NextResponse.json({ ok: true, message: mailOn ? `You're already on the list. We've emailed your place in line and your referral link to ${email}.` : `You're already on the list with ${email}. We'll write when your batch opens.` });
  }
  return NextResponse.json({
    ok: true,
    message: mailOn ? `You're on the list. We've sent a confirmation to ${email}.` : `You're on the list. We'll write to ${email} when your batch opens.`,
    position: spot.position,
    total: spot.total,
    code: spot.code,
    perReferral: SPOTS_PER_REFERRAL,
  });
}
