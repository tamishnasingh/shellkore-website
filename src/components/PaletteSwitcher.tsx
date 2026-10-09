"use client";
import { useEffect, useState } from "react";
import { PALETTES, PALETTE_KEY as KEY } from "@/lib/palettes";

/**
 * Colour-scheme preview for reviewing palette options. Picks a palette by setting `data-palette` on <html>
 * (the tokens are in globals.css), remembers it on this device, and mirrors it into the URL as ?palette=…
 * so a link opens straight on that palette. The 3D scenes listen for "sk-palette" to recolour their sky.
 */
export function PaletteSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");

  useEffect(() => { setCurrent(document.documentElement.dataset.palette || ""); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!(e.target as Element).closest(".pal")) setOpen(false); };
    addEventListener("keydown", onKey); addEventListener("pointerdown", onDown);
    return () => { removeEventListener("keydown", onKey); removeEventListener("pointerdown", onDown); };
  }, [open]);

  const choose = (id: string) => {
    const html = document.documentElement;
    if (id) html.dataset.palette = id; else delete html.dataset.palette;
    try { localStorage.setItem(KEY, id); } catch { /* storage blocked */ }
    const url = new URL(location.href);
    if (id) url.searchParams.set("palette", id); else url.searchParams.delete("palette");
    history.replaceState(history.state, "", url);
    setCurrent(id);
    dispatchEvent(new Event("sk-palette"));
  };

  const active = PALETTES.find((p) => p.id === current) ?? PALETTES[0];
  return (
    <div className="pal">
      {open ? (
        <div className="pal-menu" role="radiogroup" aria-label="Colour palette">
          <p>Preview palette</p>
          {PALETTES.map((p, i) => (
            <button key={p.id || "current"} type="button" role="radio" aria-checked={p.id === current} className="pal-opt" onClick={() => choose(p.id)}>
              <span className="pal-sw" aria-hidden="true">{p.swatch.map((c) => <i key={c} style={{ background: c }} />)}</span>
              <span>{p.name}</span>
              <b>{i === 0 ? "live site" : `Palette ${i}`}</b>
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className="pal-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="pal-sw" aria-hidden="true">{active.swatch.slice(0, 3).map((c) => <i key={c} style={{ background: c }} />)}</span>
        <span className="pal-label">Palette: {active.name}</span>
      </button>
    </div>
  );
}
