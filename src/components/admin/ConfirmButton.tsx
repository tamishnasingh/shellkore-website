"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/** Two-step submit button: first click arms it, second click submits. */
export function ConfirmButton({ label, confirmLabel }: { label: string; confirmLabel: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`btn btn-sm ${armed ? "btn-solid" : "btn-danger"}`}
      type={armed ? "submit" : "button"}
      disabled={pending}
      onClick={(e) => { if (!armed) { e.preventDefault(); setArmed(true); } }}
    >
      {pending ? "Working…" : armed ? confirmLabel : label}
    </button>
  );
}
