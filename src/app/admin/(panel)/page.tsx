import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";

export default async function Dashboard() {
  await requireAdmin();
  const [stats] = await q<{ total: string; week: string; today: string; posts: string; drafts: string; edits: string; referred: string }>(`
    select
      (select count(*) from waitlist)::text as total,
      (select count(*) from waitlist where created_at > now() - interval '7 days')::text as week,
      (select count(*) from waitlist where created_at > now() - interval '1 day')::text as today,
      (select count(*) from posts where published)::text as posts,
      (select count(*) from posts where not published)::text as drafts,
      (select count(*) from content)::text as edits,
      (select count(*) from waitlist where referred_by is not null)::text as referred`);
  const daily = await q<{ d: string; label: string; n: string }>(
    `select to_char(d, 'YYYY-MM-DD') as d, to_char(d, 'DD Mon') as label,
            (select count(*) from waitlist where (created_at at time zone 'Asia/Kolkata')::date = d)::text as n
     from generate_series((now() at time zone 'Asia/Kolkata')::date - 29, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') as g(d)
     order by d`,
  );
  const bySource = await q<{ source: string; n: string }>(
    `select coalesce(source, 'site') as source, count(*)::text as n from waitlist group by 1 order by count(*) desc limit 8`,
  );
  const topRef = await q<{ email: string; n: string }>(
    `select w.email, count(r.id)::text as n from waitlist w join waitlist r on r.referred_by = w.ref_code
     group by w.email order by count(r.id) desc, w.email limit 6`,
  );
  const max = Math.max(1, ...daily.map((d) => Number(d.n)));
  const month = daily.reduce((a, d) => a + Number(d.n), 0);
  const recent = await q<{ email: string; role: string | null; source: string | null; created_at: string }>(
    `select email, role, source, to_char(created_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') as created_at
     from waitlist order by created_at desc limit 8`,
  );
  const byRole = await q<{ role: string; n: string }>(
    `select coalesce(role, 'Not given') as role, count(*)::text as n from waitlist group by 1 order by count(*) desc`,
  );

  return (
    <>
      <div className="admin-head">
        <div><h1>Dashboard</h1><p>Waitlist and site activity at a glance.</p></div>
        <a className="btn btn-solid btn-sm" href="/api/admin/waitlist.csv">Export waitlist CSV</a>
      </div>
      <div className="cards">
        <div className="card"><small>Waitlist total</small><b>{stats.total}</b><a href="/admin/waitlist">View all →</a></div>
        <div className="card"><small>Last 7 days</small><b>{stats.week}</b><span className="msg">{stats.today} in the last 24 hours</span></div>
        <div className="card"><small>Blog posts</small><b>{stats.posts}</b><span className="msg">{stats.drafts} draft{stats.drafts === "1" ? "" : "s"}</span></div>
        <div className="card"><small>Joined through a referral</small><b>{stats.referred}</b><span className="msg">{Number(stats.total) ? Math.round((Number(stats.referred) / Number(stats.total)) * 100) : 0}% of the list</span></div>
      </div>

      <div className="tablebox chartbox">
        <div className="chart-h"><b>Signups, last 30 days</b><span className="msg">{month} total · IST</span></div>
        <svg className="daychart" viewBox={`0 0 ${daily.length * 20} 120`} preserveAspectRatio="none" role="img" aria-label={`Signups per day for the last 30 days, ${month} in total`}>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={daily.length * 20} y1={110 - f * 100} y2={110 - f * 100} className="grid" />)}
          {daily.map((d, i) => {
            const h = (Number(d.n) / max) * 100;
            return <rect key={d.d} x={i * 20 + 3} y={110 - h} width="14" height={Math.max(h, Number(d.n) ? 2 : 0.6)} rx="2" className={i === daily.length - 1 ? "today" : undefined}><title>{`${d.label}: ${d.n}`}</title></rect>;
          })}
          <line x1="0" x2={daily.length * 20} y1="110" y2="110" className="base" />
        </svg>
        <div className="chart-x"><span>{daily[0]?.label}</span><span>{daily[14]?.label}</span><span>Today</span></div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 16 }}>
        <div className="tablebox">
          <table className="atable">
            <thead><tr><th>Latest signups</th><th>Role</th><th>Joined (IST)</th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={3} className="msg">No signups yet. They'll appear here as soon as someone joins.</td></tr>}
              {recent.map((r) => <tr key={r.email}><td>{r.email}</td><td>{r.role || "—"}</td><td>{r.created_at}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="tablebox">
          <table className="atable">
            <thead><tr><th>By role</th><th style={{ textAlign: "right" }}>Signups</th></tr></thead>
            <tbody>
              {byRole.length === 0 && <tr><td colSpan={2} className="msg">No data yet.</td></tr>}
              {byRole.map((r) => <tr key={r.role}><td>{r.role}</td><td style={{ textAlign: "right" }}>{r.n}</td></tr>)}
            </tbody>
          </table>
          <table className="atable">
            <thead><tr><th>By where they joined</th><th style={{ textAlign: "right" }}>Signups</th></tr></thead>
            <tbody>
              {bySource.length === 0 && <tr><td colSpan={2} className="msg">No data yet.</td></tr>}
              {bySource.map((r) => <tr key={r.source}><td><span className="badge">{r.source}</span></td><td style={{ textAlign: "right" }}>{r.n}</td></tr>)}
            </tbody>
          </table>
          <table className="atable">
            <thead><tr><th>Top referrers</th><th style={{ textAlign: "right" }}>Brought in</th></tr></thead>
            <tbody>
              {topRef.length === 0 && <tr><td colSpan={2} className="msg">No referrals yet.</td></tr>}
              {topRef.map((r) => <tr key={r.email}><td>{r.email}</td><td style={{ textAlign: "right" }}>{r.n}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
