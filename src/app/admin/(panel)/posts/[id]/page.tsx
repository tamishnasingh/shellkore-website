import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { PostEditor } from "@/components/admin/PostEditor";
import { deletePostAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  let post = { id: "", title: "", slug: "", excerpt: "", body: "", published: false };
  if (!isNew) {
    if (!/^\d+$/.test(id)) notFound();
    const rows = await q<typeof post>(`select id::text, title, slug, excerpt, body, published from posts where id = $1`, [id]);
    if (!rows[0]) notFound();
    post = rows[0];
  }
  return (
    <>
      <div className="admin-head">
        <div>
          <a className="msg" href="/admin/posts">← All posts</a>
          <h1 style={{ marginTop: 8 }}>{isNew ? "New post" : "Edit post"}</h1>
        </div>
        {!isNew && (
          <form action={deletePostAction}>
            <input type="hidden" name="id" value={post.id} />
            <ConfirmButton label="Delete post" confirmLabel="Confirm delete" />
          </form>
        )}
      </div>
      <PostEditor initial={post} />
    </>
  );
}
