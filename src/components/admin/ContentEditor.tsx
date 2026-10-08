"use client";
import { useState, useTransition } from "react";
import { resetContentAction, saveContentAction } from "@/app/admin/actions";

type V = string | boolean | V[] | { [k: string]: V };

const human = (k: string) =>
  ({ q: "Question", a: "Answer", us: "Shellkore", colA: "Column A heading", colB: "Column B heading", desc: "Description", lede: "Intro text", cta: "Button text", blurb: "Description" } as Record<string, string>)[k] ||
  k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

const LONG_KEYS = new Set(["body", "lede", "a", "blurb", "extraFacts", "note", "greeting", "intro", "pain"]);
const MD_KEYS = new Set(["body", "extraFacts"]);

/** Empty copy of a template value, used when adding a new list item. */
function blank(t: V): V {
  if (typeof t === "string") return "";
  if (typeof t === "boolean") return false;
  if (Array.isArray(t)) return [];
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, blank(v)]));
}

function Field({ name, value, template, onChange, path }: { name: string; value: V; template: V; onChange: (v: V) => void; path: string }) {
  const id = `f-${path}`;
  if (typeof template === "boolean") {
    return (
      <label className="chk" htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> {human(name)}
      </label>
    );
  }
  if (typeof template === "string") {
    const long = LONG_KEYS.has(name) || template.length > 90;
    const md = MD_KEYS.has(name);
    return (
      <div className="f">
        <label htmlFor={id}>{human(name)}{md ? " · Markdown" : ""}</label>
        {long ? (
          <textarea id={id} className={md ? "tall" : undefined} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
        )}
      </div>
    );
  }
  if (Array.isArray(template)) {
    const list = (Array.isArray(value) ? value : []) as V[];
    const item = template[0] ?? "";
    const move = (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return;
      const copy = list.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      onChange(copy);
    };
    return (
      <div className="group">
        <header><b>{human(name)}</b><span className="msg">{list.length} item{list.length === 1 ? "" : "s"}</span></header>
        {list.map((v, i) => (
          <div className="item" key={i}>
            <div className="item-bar">
              <span>#{i + 1}</span>
              <div className="iconbtns">
                <button type="button" className="iconbtn" aria-label="Move up" onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="iconbtn" aria-label="Move down" onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="iconbtn" aria-label="Remove" onClick={() => onChange(list.filter((_, j) => j !== i))}>✕</button>
              </div>
            </div>
            <Field name={typeof item === "string" ? "text" : name} value={v} template={item} path={`${path}-${i}`} onChange={(nv) => onChange(list.map((x, j) => (j === i ? nv : x)))} />
          </div>
        ))}
        <button type="button" className="add" onClick={() => onChange([...list, blank(item)])}>+ Add item</button>
      </div>
    );
  }
  const obj = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, V>;
  return (
    <div className="form-grid">
      {Object.entries(template).map(([k, t]) => (
        <Field key={k} name={k} value={obj[k] ?? blank(t)} template={t} path={`${path}-${k}`} onChange={(nv) => onChange({ ...obj, [k]: nv })} />
      ))}
    </div>
  );
}

export function ContentEditor({ sectionKey, initial, template }: { sectionKey: string; initial: unknown; template: unknown }) {
  const [value, setValue] = useState<V>(initial as V);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);

  const save = () =>
    start(async () => {
      const r = await saveContentAction(sectionKey, JSON.stringify(value));
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) setDirty(false);
    });

  const reset = () => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
    start(async () => {
      const r = await resetContentAction(sectionKey);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) { setValue(template as V); setDirty(false); }
      setConfirmReset(false);
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="form-grid">
      <Field name={sectionKey} value={value} template={template as V} path={sectionKey} onChange={(v) => { setValue(v); setDirty(true); setMsg(null); }} />
      <div className="savebar">
        <span className={`msg${msg ? (msg.ok ? " ok" : " err") : ""}`} role="status">{msg ? msg.text : dirty ? "Unsaved changes" : "No changes"}</span>
        <div className="toolbar">
          <button type="button" className="btn btn-line btn-sm" onClick={reset} disabled={pending}>{confirmReset ? "Click again to restore original" : "Restore original"}</button>
          <button type="submit" className="btn btn-solid btn-sm" disabled={pending || !dirty}>{pending ? "Saving…" : "Save and publish"}</button>
        </div>
      </div>
    </form>
  );
}
