"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "./Logo";

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      setScrolled(window.scrollY > 8);
      const h = document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [path]);

  // Highlight the in-page section you're reading (home page only)
  const [spy, setSpy] = useState("");
  useEffect(() => {
    if (path !== "/") { setSpy(""); return; }
    const ids = LINKS.filter((l) => l.href.startsWith("/#")).map((l) => l.href.slice(2));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setSpy(e.target.id); }),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const top = () => { if (scrollY < 300) setSpy(""); };
    addEventListener("scroll", top, { passive: true });
    return () => { io.disconnect(); removeEventListener("scroll", top); };
  }, [path]);

  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="wrap">
        <Brand />
        <ul className={`nav-links${open ? " open" : ""}`} id="navLinks">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} aria-current={path === l.href ? "page" : spy && l.href === `/#${spy}` ? "true" : undefined} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <a className="btn btn-solid" href="/#waitlist">Join waitlist</a>
          <button className="menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="navLinks" onClick={() => setOpen((o) => !o)}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d={open ? "M4 4l10 10M14 4 4 14" : "M2 5h14M2 13h14"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="progress" ref={bar} aria-hidden="true" />
    </header>
  );
}
