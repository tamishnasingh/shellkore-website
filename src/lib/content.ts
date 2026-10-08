import { cache } from "react";
import { q } from "./db";
import { DEFAULTS, type Content, type ContentKey } from "./defaults";

const MAX_STRING = 20000;
const MAX_ARRAY = 40;

/**
 * Coerce an untrusted value into the same shape as `def`.
 * Unknown keys are dropped, missing keys fall back to defaults, wrong types throw.
 */
export function conform<T>(def: T, val: unknown, path = "content"): T {
  if (typeof def === "string") {
    if (typeof val !== "string") throw new Error(`${path} must be text`);
    if (val.length > MAX_STRING) throw new Error(`${path} is too long`);
    return val as T;
  }
  if (typeof def === "boolean") {
    if (typeof val !== "boolean") throw new Error(`${path} must be true or false`);
    return val as T;
  }
  if (Array.isArray(def)) {
    if (!Array.isArray(val)) throw new Error(`${path} must be a list`);
    if (val.length > MAX_ARRAY) throw new Error(`${path} has too many items`);
    const tmpl = def[0];
    return val.map((v, i) => conform(tmpl, v, `${path}[${i + 1}]`)) as T;
  }
  if (def && typeof def === "object") {
    if (!val || typeof val !== "object" || Array.isArray(val)) throw new Error(`${path} must be a group of fields`);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(def)) {
      const dv = (def as Record<string, unknown>)[k];
      const vv = (val as Record<string, unknown>)[k];
      out[k] = vv === undefined ? dv : conform(dv, vv, `${path}.${k}`);
    }
    return out as T;
  }
  throw new Error(`${path} has an unsupported type`);
}

/** All site content, with saved edits layered over defaults. Cached per request. */
export const getContent = cache(async (): Promise<Content> => {
  const merged = structuredClone(DEFAULTS) as Content;
  try {
    const rows = await q<{ key: string; value: unknown }>(`select key, value from content`);
    for (const r of rows) {
      if (!(r.key in DEFAULTS)) continue;
      const k = r.key as ContentKey;
      try {
        (merged as Record<string, unknown>)[k] = conform(DEFAULTS[k], r.value, k);
      } catch {
        /* keep default if a stored value no longer matches */
      }
    }
  } catch (e) {
    console.error("content: falling back to defaults", e);
  }
  return merged;
});

export async function saveContent(key: ContentKey, value: unknown) {
  const clean = conform(DEFAULTS[key], value, key);
  await q(
    `insert into content (key, value, updated_at) values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(clean)],
  );
  return clean;
}

export async function resetContent(key: ContentKey) {
  await q(`delete from content where key = $1`, [key]);
}

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

export const getPublishedPosts = cache(async (): Promise<Post[]> => {
  try {
    return await q<Post>(
      `select id::text, slug, title, excerpt, body, published, published_at::text, updated_at::text
       from posts where published order by published_at desc nulls last limit 100`,
    );
  } catch (e) {
    console.error(e);
    return [];
  }
});

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const rows = await q<Post>(
    `select id::text, slug, title, excerpt, body, published, published_at::text, updated_at::text
     from posts where slug = $1 and published limit 1`,
    [slug],
  );
  return rows[0] ?? null;
});
