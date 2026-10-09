import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { PALETTE_BOOT } from "@/lib/palettes";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://shellkore.com";
const DESC =
  "Shellkore runs construction and interiors businesses from lead to cash: photo-to-BOQ, WhatsApp approvals, procurement and live project P&L in one ledger.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Shellkore — The Construction OS", template: "%s · Shellkore" },
  description: DESC,
  applicationName: "Shellkore",
  openGraph: { type: "website", siteName: "Shellkore", title: "Shellkore — The Construction OS", description: DESC, url: SITE },
  twitter: { card: "summary_large_image", title: "Shellkore — The Construction OS", description: DESC },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F6F2",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the palette preview script sets data-palette on <html> before React hydrates
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PALETTE_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
