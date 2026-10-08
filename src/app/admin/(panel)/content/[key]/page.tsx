import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { CONTENT_KEYS, CONTENT_LABELS, DEFAULTS, type ContentKey } from "@/lib/defaults";
import { ContentEditor } from "@/components/admin/ContentEditor";

const HELP: Partial<Record<ContentKey, string>> = {
  settings: "Leave the announcement empty to hide the bar at the top of every page.",
  about: "The body uses Markdown: ## for a heading, - for a bullet, **bold**, [link text](https://…).",
  terms: "Template text. Have it reviewed before launch. The body uses Markdown.",
  privacy: "Template text. Have it reviewed before launch. The body uses Markdown.",
  chatbot: "Extra facts are added to what the assistant knows. Only add things that are true and public.",
};

export default async function EditContent({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin();
  const { key } = await params;
  if (!CONTENT_KEYS.includes(key as ContentKey)) notFound();
  const k = key as ContentKey;
  const c = await getContent();
  return (
    <>
      <div className="admin-head">
        <div>
          <a className="msg" href="/admin/content">← All sections</a>
          <h1 style={{ marginTop: 8 }}>{CONTENT_LABELS[k]}</h1>
          {HELP[k] && <p>{HELP[k]}</p>}
        </div>
      </div>
      <ContentEditor sectionKey={k} initial={c[k]} template={DEFAULTS[k]} />
    </>
  );
}
