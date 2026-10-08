import { isAdmin } from "@/lib/auth";
import { q } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prefix cells that spreadsheet apps would treat as formulas.
const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });
  const rows = await q<Record<string, unknown>>(
    `select email, role, company, source, ref_code, referred_by,
            (select count(*) from waitlist w2 where w2.referred_by = waitlist.ref_code and waitlist.ref_code is not null) as referrals,
            to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') as joined_ist
     from waitlist order by created_at asc`,
  );
  const head = ["email", "role", "company", "source", "ref_code", "referred_by", "referrals", "joined_ist"];
  const csv = [head.join(","), ...rows.map((r) => head.map((h) => cell(r[h])).join(","))].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shellkore-waitlist-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
