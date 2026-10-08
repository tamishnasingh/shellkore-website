/**
 * Database access.
 * - Production (Vercel): set DATABASE_URL to a Postgres connection string (Neon, Supabase, Vercel Postgres).
 * - Local development: with no DATABASE_URL, an embedded Postgres (PGlite) stores data in ./.data/pglite.
 * Tables are created automatically on first use.
 */
type Row = Record<string, unknown>;
type Db = { query: <T extends Row = Row>(text: string, params?: unknown[]) => Promise<T[]> };

const SCHEMA = [
  `create table if not exists waitlist (
     id bigserial primary key,
     email text not null unique,
     role text,
     company text,
     source text,
     ip_hash text,
     user_agent text,
     created_at timestamptz not null default now())`,
  `create table if not exists content (
     key text primary key,
     value jsonb not null,
     updated_at timestamptz not null default now())`,
  `create table if not exists posts (
     id bigserial primary key,
     slug text not null unique,
     title text not null,
     excerpt text not null default '',
     body text not null default '',
     published boolean not null default false,
     published_at timestamptz,
     updated_at timestamptz not null default now())`,
  `create table if not exists rate_events (
     key text not null,
     created_at timestamptz not null default now())`,
  `create index if not exists rate_events_key_time on rate_events (key, created_at)`,
  // referrals: each signup gets a short code; joining through someone's link credits them
  `alter table waitlist add column if not exists ref_code text`,
  `alter table waitlist add column if not exists referred_by text`,
  `create unique index if not exists waitlist_ref_code on waitlist (ref_code)`,
  `create index if not exists waitlist_referred_by on waitlist (referred_by)`,
  `insert into posts (slug, title, excerpt, body, published, published_at)
     values ('erp-easy-is-now-shellkore', 'ERP Easy is now Shellkore',
       'Same team, same connected flow from lead to cash, now built out as a full construction operating system.',
       E'ERP Easy is now **Shellkore**.\\n\\nThe product our team at Techfnatic Labs has been building for construction and interior design businesses has a new name, and a bigger job. Shellkore is a construction operating system: leads, estimates, BOQs, procurement, approvals, execution and invoicing run on one connected ledger.\\n\\n## What stays the same\\n\\n- One flow from lead to cash, with every PO and invoice tied back to the job\\n- Photo-to-BOQ takeoffs priced on your own material catalog\\n- Estimates and change orders approved by clients on WhatsApp\\n- Project-wise P&L that updates as work happens\\n\\n## What comes next\\n\\nMarketplace (materials, vendors, rentals) and Talent Hub (skilled labour, crews, payroll) will join the same ecosystem.\\n\\nWe are onboarding teams from the waitlist in batches. Founding members get early access and founding-member pricing.',
       true, now())
     on conflict (slug) do nothing`,
];

declare global {
  // eslint-disable-next-line no-var
  var __skDb: Promise<Db> | undefined;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;
  if (url) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      prepare: false, // works with pooled (pgbouncer) connections
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    });
    db = { query: async (text, params = []) => (await sql.unsafe(text, params as never[])) as never };
  } else {
    if (process.env.VERCEL) throw new Error("DATABASE_URL is not set. Add a Postgres database in Vercel → Storage.");
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR || "./.data/pglite";
    (await import("node:fs")).mkdirSync(dir, { recursive: true });
    const pg = new PGlite(dir);
    db = { query: async (text, params = []) => (await pg.query(text, params as unknown[])).rows as never };
  }
  for (const stmt of SCHEMA) await db.query(stmt);
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__skDb) {
    globalThis.__skDb = connect().catch((e) => {
      globalThis.__skDb = undefined;
      throw e;
    });
  }
  return globalThis.__skDb;
}

export async function q<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(text, params);
}
