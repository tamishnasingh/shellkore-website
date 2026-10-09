"use client";
import { useEffect, useRef } from "react";

// Each island is loaded on demand, so the page ships only the code it uses.
const LOADERS = {
  plan: () => import("@/islands/plan"),
  journey: () => import("@/islands/journey"),
  strike: () => import("@/islands/strike"),
  reveal: () => import("@/islands/reveal"),
  stage: () => import("@/islands/stage"),
  orbit: () => import("@/islands/orbit"),
  how: () => import("@/islands/how"),
  tour: () => import("@/islands/tour"),
  merge: () => import("@/islands/merge"),
  calc: () => import("@/islands/calc"),
  city: () => import("@/islands/city"),
  sites: () => import("@/islands/sites"),
  intro: () => import("@/islands/intro"),
  mark3d: () => import("@/islands/mark3d"),
  roadmap: () => import("@/islands/roadmap"),
  hero3d: () => import("@/islands/hero3d"),
  toolkit: () => import("@/islands/toolkit"),
  pauser: () => import("@/islands/pauser"),
} as const;

type Props = { name: keyof typeof LOADERS; as?: "div" | "section" | "ol" | "ul"; className?: string; id?: string; children?: React.ReactNode; html?: string; data?: Record<string, string> };

/** Server-rendered markup, enhanced in the browser by a small framework-free module. */
export function Island({ name, as = "div", className, id, children, html, data }: Props) {
  const attrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    let off: (() => void) | undefined, dead = false;
    LOADERS[name]().then((m) => { if (!dead && ref.current) off = m.mount(ref.current); });
    return () => { dead = true; off?.(); };
  }, [name]);
  const Tag = as as "div";
  return html !== undefined ? (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={className} id={id} data-island={name} {...attrs} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={className} id={id} data-island={name} {...attrs}>{children}</Tag>
  );
}
