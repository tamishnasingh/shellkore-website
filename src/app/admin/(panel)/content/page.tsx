import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { CONTENT_KEYS, CONTENT_LABELS } from "@/lib/defaults";

export default async function ContentIndex() {
  await requireAdmin();
  const rows = await q<{ key: string; updated: string }>(
    `select key, to_char(updated_at at time zone 'Asia/Kolkata', 'DD Mon, HH24:MI') as updated from content`,
  );
  const edited = new Map(rows.map((r) => [r.key, r.updated]));
  return (
    <>
      <div className="admin-head">
        <div><h1>Site content</h1><p>Edit any text on the site. Changes go live as soon as you save.</p></div>
      </div>
      <div className="content-list">
        {CONTENT_KEYS.map((k) => (
          <a key={k} href={`/admin/content/${k}`}>
            <b>{CONTENT_LABELS[k]}</b>
            <small>{edited.has(k) ? `Edited ${edited.get(k)} IST` : "Original text"}</small>
          </a>
        ))}
      </div>
    </>
  );
}
