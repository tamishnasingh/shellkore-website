"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, requireAdmin } from "@/lib/auth";
import { clientIp, hashIp, rateLimit, safeEqual } from "@/lib/security";
import { CONTENT_KEYS, type ContentKey } from "@/lib/defaults";
import { resetContent, saveContent } from "@/lib/content";
import { q } from "@/lib/db";

export type Result = { ok: boolean; message: string };

/* ---------- auth ---------- */
export async function loginAction(_: Result | null, fd: FormData): Promise<Result> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 10) {
    return { ok: false, message: "Admin login is disabled. Set ADMIN_PASSWORD (10+ characters) in your environment variables." };
  }
  const ip = hashIp(await clientIp());
  if (!(await rateLimit(`login:${ip}`, 5, 900))) {
    return { ok: false, message: "Too many attempts. Wait 15 minutes and try again." };
  }
  const password = String(fd.get("password") || "");
  if (!safeEqual(password, expected)) return { ok: false, message: "That password isn't right." };
  await createSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- content ---------- */
function refreshSite() {
  revalidatePath("/", "layout");
}

export async function saveContentAction(key: string, json: string): Promise<Result> {
  await requireAdmin();
  if (!CONTENT_KEYS.includes(key as ContentKey)) return { ok: false, message: "Unknown section." };
  if (json.length > 200_000) return { ok: false, message: "This section is too large to save." };
  try {
    await saveContent(key as ContentKey, JSON.parse(json));
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Couldn't save." };
  }
  refreshSite();
  return { ok: true, message: "Saved. The live site is updated." };
}

export async function resetContentAction(key: string): Promise<Result> {
  await requireAdmin();
  if (!CONTENT_KEYS.includes(key as ContentKey)) return { ok: false, message: "Unknown section." };
  await resetContent(key as ContentKey);
  refreshSite();
  return { ok: true, message: "Restored the original text." };
}

/* ---------- waitlist ---------- */
export async function deleteSignupAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") || "");
  if (/^\d+$/.test(id)) await q(`delete from waitlist where id = $1`, [id]);
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
}

/* ---------- posts ---------- */
const PostInput = z.object({
  id: z.string().regex(/^\d*$/),
  title: z.string().trim().min(3, "Add a title (3+ characters).").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "The URL can only use lowercase letters, numbers and single dashes."),
  excerpt: z.string().trim().max(400),
  body: z.string().max(100_000),
  published: z.boolean(),
});

export async function savePostAction(input: z.input<typeof PostInput>): Promise<Result & { id?: string }> {
  await requireAdmin();
  const p = PostInput.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message || "Check the fields and try again." };
  const d = p.data;
  try {
    if (d.id) {
      await q(
        `update posts set title=$2, slug=$3, excerpt=$4, body=$5, published=$6,
           published_at = case when $6 and published_at is null then now() when not $6 then null else published_at end,
           updated_at = now()
         where id = $1`,
        [d.id, d.title, d.slug, d.excerpt, d.body, d.published],
      );
    } else {
      const rows = await q<{ id: string }>(
        `insert into posts (title, slug, excerpt, body, published, published_at)
         values ($1,$2,$3,$4,$5, case when $5 then now() end) returning id::text`,
        [d.title, d.slug, d.excerpt, d.body, d.published],
      );
      d.id = rows[0].id;
    }
  } catch (e) {
    const msg = e instanceof Error && /unique|duplicate/i.test(e.message) ? "Another post already uses that URL." : "Couldn't save the post.";
    return { ok: false, message: msg };
  }
  revalidatePath("/blog");
  revalidatePath(`/blog/${d.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/posts");
  return { ok: true, message: d.published ? "Saved and published." : "Saved as a draft.", id: d.id };
}

export async function deletePostAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") || "");
  if (/^\d+$/.test(id)) await q(`delete from posts where id = $1`, [id]);
  revalidatePath("/blog", "layout");
  redirect("/admin/posts");
}
