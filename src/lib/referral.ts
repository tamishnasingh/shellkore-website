import { createHmac, randomBytes } from "node:crypto";
import { q } from "./db";
import { sessionSecret } from "./security";

/** Spots a signup moves up for each person who joins through their link. */
export const SPOTS_PER_REFERRAL = 5;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes (0/o, 1/l/i)
export function newRefCode(): string {
  const b = randomBytes(7);
  return Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
}
export const isRefCode = (s: unknown): s is string => typeof s === "string" && /^[a-z2-9]{7}$/.test(s);

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://shellkore.com").replace(/\/$/, "");
}
export const refLink = (code: string) => `${siteUrl()}/?ref=${code}`;

/** Signed, stateless unsubscribe link, so nobody can remove someone else's address. */
export function unsubToken(email: string): string {
  return createHmac("sha256", sessionSecret()).update("unsub|" + email).digest("base64url").slice(0, 32);
}
export const unsubLink = (email: string) => `${siteUrl()}/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;

export type Spot = { position: number; total: number; referrals: number; code: string };

/** Place in line: order of signup, moved up SPOTS_PER_REFERRAL for each referral, never above #1. */
export async function spotFor(email: string): Promise<Spot | null> {
  const rows = await q<{ id: string; ref_code: string | null }>(`select id::text, ref_code from waitlist where email = $1`, [email]);
  const me = rows[0];
  if (!me) return null;
  let code = me.ref_code;
  if (!code) {
    // older rows from before referrals existed
    for (let i = 0; i < 5 && !code; i++) {
      const c = newRefCode();
      const u = await q<{ ref_code: string }>(`update waitlist set ref_code = $1 where id = $2 and ref_code is null and not exists (select 1 from waitlist where ref_code = $1) returning ref_code`, [c, me.id]);
      code = u[0]?.ref_code ?? (await q<{ ref_code: string | null }>(`select ref_code from waitlist where id = $1`, [me.id]))[0]?.ref_code ?? null;
    }
  }
  const [r] = await q<{ ahead: string; total: string; refs: string }>(
    `select (select count(*) from waitlist where id <= $1)::text as ahead,
            (select count(*) from waitlist)::text as total,
            (select count(*) from waitlist where referred_by = $2)::text as refs`,
    [me.id, code],
  );
  const referrals = Number(r.refs);
  return { position: Math.max(1, Number(r.ahead) - referrals * SPOTS_PER_REFERRAL), total: Number(r.total), referrals, code: code! };
}
