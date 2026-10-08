import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { PageHero } from "@/components/PageHero";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = /^[a-z0-9-]{1,100}$/.test(slug) ? await getPostBySlug(slug) : null;
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.excerpt, publishedTime: post.published_at || undefined },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) notFound();
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
  const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, datePublished: post.published_at, dateModified: post.updated_at, publisher: { "@type": "Organization", name: "Shellkore" } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <PageHero title={post.title} lede={post.excerpt}><span className="meta">{date}</span></PageHero>
      <section className="band">
        <div className="wrap">
          <article className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
          <p style={{ marginTop: 48 }}><a className="btn btn-line" href="/blog">All posts</a></p>
        </div>
      </section>
    </>
  );
}
