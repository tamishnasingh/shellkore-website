"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { LogoMark } from "@/components/Logo";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, font: "800 1.2rem var(--display)", fontStretch: "118%" }}>
        <LogoMark /> Shellkore admin
      </div>
      <p className="msg">Sign in to manage the waitlist, site content and blog.</p>
      <div className="f">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      {state && !state.ok && <p className="msg err" role="alert">{state.message}</p>}
      <button className="btn btn-solid" type="submit" disabled={pending} style={{ justifyContent: "center" }}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <a href="/" className="msg">← Back to site</a>
    </form>
  );
}
