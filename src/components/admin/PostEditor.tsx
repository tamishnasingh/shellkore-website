"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePostAction } from "@/app/admin/actions";

type Post = { id: string; title: string; slug: string; excerpt: string; body: string; published: boolean };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 100);

export function PostEditor({ initial }: { initial: Post }) {
  const [p, setP] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const set = <K extends keyof Post>(k: K, v: Post[K]) => { setP((x) => ({ ...x, [k]: v })); setMsg(null); };

  const save = (published: boolean) =>
    start(async () => {
      const r = await savePostAction({ ...p, published });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setP((x) => ({ ...x, published, id: r.id || x.id }));
        if (!initial.id && r.id) router.replace(`/admin/posts/${r.id}`);
      }
    });

  return (
    <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save(p.published); }}>
      <div className="f">
        <label htmlFor="pt">Title</label>
        <input id="pt" type="text" value={p.title} maxLength={160} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
      </div>
      <div className="f">
        <label htmlFor="ps">URL</label>
        <input id="ps" type="text" value={p.slug} maxLength={100} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
        <span className="hint">shellkore.com/blog/{p.slug || "your-post"}</span>
      </div>
      <div className="f">
        <label htmlFor="pe">Summary</label>
        <textarea id="pe" value={p.excerpt} maxLength={400} onChange={(e) => set("excerpt", e.target.value)} />
        <span className="hint">Shown on the blog list and in search results. {p.excerpt.length}/400</span>
      </div>
      <div className="f">
        <label htmlFor="pb">Body · Markdown</label>
        <textarea id="pb" className="tall" value={p.body} onChange={(e) => set("body", e.target.value)} />
        <span className="hint">## Heading · **bold** · - bullet · [link](https://…)</span>
      </div>
      <div className="savebar">
        <span className={`msg${msg ? (msg.ok ? " ok" : " err") : ""}`} role="status">{msg?.text || (p.published ? "Published" : "Draft")}</span>
        <div className="toolbar">
          {p.published ? (
            <button type="button" className="btn btn-line btn-sm" disabled={pending} onClick={() => save(false)}>Unpublish</button>
          ) : (
            <button type="button" className="btn btn-line btn-sm" disabled={pending} onClick={() => save(false)}>Save draft</button>
          )}
          <button type="button" className="btn btn-solid btn-sm" disabled={pending} onClick={() => save(true)}>{pending ? "Saving…" : p.published ? "Update" : "Publish"}</button>
        </div>
      </div>
    </form>
  );
}
