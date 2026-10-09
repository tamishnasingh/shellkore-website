import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AskWidget } from "@/components/AskWidget";
import { PaletteSwitcher } from "@/components/PaletteSwitcher";
import { getContent } from "@/lib/content";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const c = await getContent();
  return (
    <>
      <span id="top" />
      <a className="skip" href="#main">Skip to content</a>
      {c.settings.announcement ? (
        <div className="announce" role="note">{c.settings.announcement}</div>
      ) : null}
      <Nav />
      <main id="main">{children}</main>
      <Footer email={c.settings.contactEmail} linkedin={c.settings.linkedin} />
      <AskWidget greeting={c.chatbot.greeting} suggestions={c.chatbot.suggestions} />
      <PaletteSwitcher />
    </>
  );
}
