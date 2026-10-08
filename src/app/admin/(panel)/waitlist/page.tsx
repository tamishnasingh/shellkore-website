import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { deleteSignupAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

const PAGE = 50;

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const term = (sp.q || "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
  const where = term ? `where email ilike $1 or coalesce(role,'') ilike $1 or coalesce(source,'') ilike $1` : "";
  const params = term ? [like] : [];
  const [{ n }] = await q<{ n: string }>(`select count(*)::text as n from waitlist ${where}`, params);
  const rows = await q<{ id: string; email: string; role: string | null; source: string | null; created_at: string; refs: string; referred: boolean }>(
    `select id::text, email, role, source, to_char(created_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') as created_at,
            (select count(*) from waitlist w2 where w2.referred_by = waitlist.ref_code and waitlist.ref_code is not null)::text as refs,
            referred_by is not null as referred
     from waitlist ${where} order by id desc limit ${PAGE} offset ${(page - 1) * PAGE}`,
    params,
  );
  const pages = Math.max(1, Math.ceil(Number(n) / PAGE));
  const link = (p: number) => `/admin/waitlist?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(p) })}`;

  return (
    <>
      <div className="admin-head">
        <div><h1>Waitlist</h1><p>{n} {term ? "matching" : "total"} signup{n === "1" ? "" : "s"}.</p></div>
        <a className="btn btn-solid btn-sm" href="/api/admin/waitlist.csv">Export CSV</a>
      </div>
      <form className="toolbar" method="get">
        <label htmlFor="wq" className="hp">Search</label>
        <input id="wq" className="field" name="q" defaultValue={term} placeholder="Search by email, role or source" />
        <button className="btn btn-line btn-sm" type="submit">Search</button>
        {term && <a className="msg" href="/admin/waitlist">Clear</a>}
      </form>
      <div className="tablebox">
        <table className="atable">
          <thead><tr><th>Email</th><th>Role</th><th>From</th><th style={{ textAlign: "right" }}>Referrals</th><th>Joined (IST)</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="msg">{term ? "No signups match that search." : "No signups yet."}</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                <td>{r.role || "—"}</td>
                <td><span className="badge">{r.source || "site"}</span>{r.referred && <span className="badge" style={{ marginLeft: 6 }}>referred</span>}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.refs === "0" ? "—" : r.refs}</td>
                <td>{r.created_at}</td>
                <td style={{ textAlign: "right" }}>
                  <form action={deleteSignupAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton label="Remove" confirmLabel="Confirm remove" />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="toolbar">
          {page > 1 && <a className="btn btn-line btn-sm" href={link(page - 1)}>← Newer</a>}
          <span className="msg">Page {page} of {pages}</span>
          {page < pages && <a className="btn btn-line btn-sm" href={link(page + 1)}>Older →</a>}
        </div>
      )}
    </>
  );
}
