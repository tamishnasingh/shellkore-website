import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";

export default async function PostsAdmin() {
  await requireAdmin();
  const posts = await q<{ id: string; title: string; slug: string; published: boolean; updated: string }>(
    `select id::text, title, slug, published, to_char(updated_at at time zone 'Asia/Kolkata', 'DD Mon YYYY') as updated
     from posts order by updated_at desc`,
  );
  return (
    <>
      <div className="admin-head">
        <div><h1>Blog posts</h1><p>Write updates and articles. Drafts stay private until you publish.</p></div>
        <a className="btn btn-solid btn-sm" href="/admin/posts/new">New post</a>
      </div>
      <div className="tablebox">
        <table className="atable">
          <thead><tr><th>Title</th><th>Status</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {posts.length === 0 && <tr><td colSpan={4} className="msg">No posts yet. Write your first one.</td></tr>}
            {posts.map((p) => (
              <tr key={p.id}>
                <td><a href={`/admin/posts/${p.id}`}>{p.title}</a><br /><span className="meta">/blog/{p.slug}</span></td>
                <td><span className={`badge${p.published ? " on" : ""}`}>{p.published ? "Published" : "Draft"}</span></td>
                <td>{p.updated}</td>
                <td style={{ textAlign: "right" }}>{p.published && <a className="msg" href={`/blog/${p.slug}`} target="_blank" rel="noopener">View ↗</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
