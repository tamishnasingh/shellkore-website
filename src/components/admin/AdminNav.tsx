"use client";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Logo";
import { logoutAction } from "@/app/admin/actions";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/content", label: "Site content" },
  { href: "/admin/posts", label: "Blog posts" },
];

export function AdminNav() {
  const path = usePathname();
  const active = (l: (typeof LINKS)[number]) => (l.exact ? path === l.href : path.startsWith(l.href));
  return (
    <nav className="admin-side" aria-label="Admin">
      <Brand href="/admin" />
      <span className="grp">Manage</span>
      {LINKS.map((l) => (
        <a key={l.href} href={l.href} aria-current={active(l) ? "page" : undefined}>{l.label}</a>
      ))}
      <span className="grp">Site</span>
      <a href="/" target="_blank" rel="noopener">View live site ↗</a>
      <span className="spacer" />
      <form action={logoutAction}>
        <button className="linkish" type="submit">Sign out</button>
      </form>
    </nav>
  );
}
