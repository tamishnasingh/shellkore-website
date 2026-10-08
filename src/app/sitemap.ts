import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://shellkore.com";
  const pages = ["", "/about", "/blog", "/terms", "/privacy"].map((p) => ({ url: base + p, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  const posts = (await getPublishedPosts()).map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updated_at ? new Date(p.updated_at) : undefined, priority: 0.5 }));
  return [...pages, ...posts];
}
