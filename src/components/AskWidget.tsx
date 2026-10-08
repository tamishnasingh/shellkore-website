"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

export function AskWidget({ greeting, suggestions }: { greeting: string; suggestions: string[] }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const fab = useRef<HTMLButtonElement>(null);

  const path = usePathname();
  const [away, setAway] = useState(path === "/");
  useEffect(() => {
    // On the home page the button waits until the hero has been read, so it never covers the hero
    const onScroll = () => setAway(path === "/" && scrollY < innerHeight * 0.7);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [path]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [msgs, busy]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    fab.current?.focus();
  }

  async function ask(q: string) {
    q = q.trim().slice(0, 600);
    if (!q || busy) return;
    const history = [...msgs.filter((m) => !m.error), { role: "user" as const, content: q }].slice(-10);
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "The assistant is unavailable right now.");
      }
      setMsgs((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMsgs((m) => {
          const copy = m.slice();
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong.", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  const waiting = busy && (msgs[msgs.length - 1]?.role === "user");

  return (
    <>
      <button ref={fab} className={`ask-fab${away && !open ? " away" : ""}`} tabIndex={away && !open ? -1 : 0} type="button" aria-expanded={open} aria-controls="askPanel" onClick={() => (open ? close() : setOpen(true))}>
        <span className="pulse" aria-hidden="true" />
        <span className="lbl">Ask Shellkore</span>
        <span className="hp">{open ? "Close assistant" : "Open assistant"}</span>
      </button>
      {open && (
        <div className="ask" id="askPanel" role="dialog" aria-label="Ask Shellkore">
          <header>
            <div><b>Ask Shellkore</b><small>AI assistant · answers about Shellkore</small></div>
            <button className="x" type="button" aria-label="Close assistant" onClick={close}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </header>
          <div className="ask-log" role="log" aria-live="polite" ref={log}>
            <div className="bub">{greeting}</div>
            {msgs.map((m, i) => (
              <div key={i} className={`bub${m.role === "user" ? " me" : ""}${m.error ? " err" : ""}`}>{m.content}</div>
            ))}
            {waiting && <div className="bub"><span className="typing"><i /><i /><i /></span></div>}
          </div>
          {msgs.length === 0 && (
            <div className="suggest">
              {suggestions.map((s) => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); ask(text); }}>
            <label htmlFor="askInput" className="hp">Your question</label>
            <input ref={input} id="askInput" type="text" maxLength={600} autoComplete="off" placeholder="Ask about features, launch, the waitlist…" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="submit" aria-label="Send" disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
