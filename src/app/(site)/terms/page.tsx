import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 300;
export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default async function Terms() {
  const { terms } = await getContent();
  return <LegalPage {...terms} />;
}
