import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/content";
import { PageHero } from "@/components/PageHero";

export const revalidate = 300;
export const metadata: Metadata = { title: "Blog", description: "Product news and notes on running construction and interiors businesses, from the Shellkore team.", alternates: { canonical: "/blog" } };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

export default async function Blog() {
  const posts = await getPublishedPosts();
  return (
    <>
      <PageHero title="Notes from the site office." lede="Product news and ideas on running construction and interiors businesses, from the Shellkore team." />
      <section className="band">
        <div className="wrap">
          {posts.length === 0 ? (
            <div className="empty">No posts yet. Check back soon.</div>
          ) : (
            <div className="posts">
              {posts.map((p) => (
                <a key={p.id} className="post-row" href={`/blog/${p.slug}`}>
                  <span className="meta">{fmt(p.published_at)}</span>
                  <div><h2>{p.title}</h2>{p.excerpt && <p>{p.excerpt}</p>}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
