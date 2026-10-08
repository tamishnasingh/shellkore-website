import { renderMarkdown } from "@/lib/markdown";
import { PageHero } from "./PageHero";

export function LegalPage({ heading, updated, body }: { heading: string; updated: string; body: string }) {
  return (
    <>
      <PageHero title={heading}><span className="meta">Last updated {updated}</span></PageHero>
      <section className="band"><div className="wrap"><div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} /></div></section>
    </>
  );
}
