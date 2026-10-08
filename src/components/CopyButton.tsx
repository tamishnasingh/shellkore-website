"use client";
import { useState } from "react";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Icon button that copies `text`; shows a tick for a moment once copied. */
export function CopyButton({ text, label = "Copy email address" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const tip = state === "ok" ? "Copied" : state === "err" ? "Select and copy" : "Copy";
  return (
    <button
      className={`copy${state === "ok" ? " ok" : ""}`}
      type="button"
      aria-label={state === "ok" ? "Copied" : label}
      title={tip}
      data-tip={tip}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setState("ok"); } catch { setState("err"); }
        setTimeout(() => setState("idle"), 1600);
      }}
    >
      {state === "ok" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" {...P} strokeWidth={2}><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" {...P}><rect x="5.5" y="5.5" width="8" height="8" rx="2" /><path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" /></svg>
      )}
    </button>
  );
}
