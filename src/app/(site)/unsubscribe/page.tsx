import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { q } from "@/lib/db";
import { unsubToken } from "@/lib/referral";
import { safeEqual } from "@/lib/security";

export const metadata: Metadata = { title: "Leave the waitlist", robots: { index: false } };
export const dynamic = "force-dynamic";

const valid = (e: string, t: string) => e.length > 3 && e.length <= 254 && t.length === 32 && safeEqual(unsubToken(e), t);

async function leave(fd: FormData) {
  "use server";
  const e = String(fd.get("e") || "").toLowerCase(), t = String(fd.get("t") || "");
  if (!valid(e, t)) redirect("/unsubscribe?status=invalid");
  await q(`delete from waitlist where email = $1`, [e]);
  redirect("/unsubscribe?status=done");
}

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; status?: string }> }) {
  const sp = await searchParams;
  if (sp.status === "done")
    return <PageHero title="You're off the list." lede="We've deleted your email address from the Shellkore waitlist. You won't hear from us again unless you sign up anew." ><a className="btn btn-line" href="/">Back to Shellkore</a></PageHero>;
  const e = (sp.e || "").toLowerCase(), t = sp.t || "";
  if (sp.status === "invalid" || !valid(e, t))
    return <PageHero title="This link doesn't work." lede="It may be incomplete or already used. Use the link in your most recent Shellkore email, or reply to that email and we'll remove you by hand." ><a className="btn btn-line" href="/">Back to Shellkore</a></PageHero>;
  return (
    <PageHero title="Leave the waitlist?" lede={`This deletes ${e} from the Shellkore waitlist, along with your place in line and your referral link.`}>
      {/* A button, not an automatic removal, so email link scanners can't unsubscribe people by visiting the page. */}
      <form action={leave} className="hero-actions" style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <input type="hidden" name="e" value={e} />
        <input type="hidden" name="t" value={t} />
        <button className="btn btn-solid" type="submit">Yes, remove me</button>
        <a className="btn btn-line" href="/">Keep my spot</a>
      </form>
    </PageHero>
  );
}
