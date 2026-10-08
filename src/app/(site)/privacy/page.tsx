import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 300;
export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default async function Privacy() {
  const { privacy } = await getContent();
  return <LegalPage {...privacy} />;
}
