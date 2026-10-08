import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { q } from "./db";

let devSecret: string | undefined;
export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("SESSION_SECRET must be set to at least 32 random characters.");
  }
  devSecret ??= randomBytes(32).toString("hex");
  return devSecret;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "0.0.0.0").trim();
}

/** One-way hash so raw IP addresses are never stored. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip + "|" + sessionSecret()).digest("hex").slice(0, 32);
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Sliding-window rate limit stored in Postgres, so it works across serverless instances.
 * Returns true when the action is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (Math.random() < 0.02) await q(`delete from rate_events where created_at < now() - interval '1 day'`);
  const rows = await q<{ n: string }>(
    `select count(*)::text as n from rate_events where key = $1 and created_at > now() - make_interval(secs => $2)`,
    [key, windowSec],
  );
  if (Number(rows[0]?.n ?? 0) >= limit) return false;
  await q(`insert into rate_events (key) values ($1)`, [key]);
  return true;
}

/** Same-origin check for JSON POST endpoints (blocks cross-site form posts). */
export async function sameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true; // non-browser clients; still rate limited
  const host = h.get("x-forwarded-host") || h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
