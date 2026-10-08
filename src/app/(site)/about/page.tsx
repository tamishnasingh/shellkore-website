import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { PageHero } from "@/components/PageHero";
import { CopyButton } from "@/components/CopyButton";
import { Operator } from "@/components/home/Art";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  const { about } = await getContent();
  return { title: "About", description: about.lede, alternates: { canonical: "/about" } };
}

export default async function About() {
  const { about, hero, settings } = await getContent();
  return (
    <>
      <PageHero title={about.heading} lede={about.lede} />
      <section className="band">
        <div className="wrap two-col">
          <aside className="side-facts">
            <div><h3>Built by operators at</h3><div className="who">{hero.builtBy.map((b) => <Operator key={b} name={b} height={26} />)}</div></div>
            <div><h3>Write to the team</h3><div className="mail"><span>{settings.contactEmail}</span><CopyButton text={settings.contactEmail} /></div></div>
            <a className="btn btn-solid" href="/#waitlist" style={{ alignSelf: "flex-start" }}>Join the waitlist</a>
          </aside>
          <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(about.body) }} />
        </div>
      </section>
    </>
  );
}
