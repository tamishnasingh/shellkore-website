/**
 * Preview runtime: makes the server-rendered Shellkore page interactive without React,
 * so the shareable preview runs the same markup and the same island modules as the real site.
 */
import { mount as reveal } from "../src/islands/reveal";
import { mount as stage } from "../src/islands/stage";
import { mount as orbit } from "../src/islands/orbit";
import { mount as how } from "../src/islands/how";
import { mount as tour } from "../src/islands/tour";
import { mount as merge } from "../src/islands/merge";
import { mount as calc } from "../src/islands/calc";
import { mount as city } from "../src/islands/city";
import { mount as sites } from "../src/islands/sites";
import { mount as mark3d } from "../src/islands/mark3d";
import { mount as plan3d } from "../src/islands/plan3d";
import { mount as intro } from "../src/islands/intro";

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// islands
const ISLANDS: Record<string, (el: HTMLElement) => unknown> = { reveal, stage, orbit, how, tour, merge, calc, city, sites, mark3d, plan3d, intro };
$$<HTMLElement>("[data-island]").forEach((el) => ISLANDS[el.dataset.island!]?.(el));

// nav: scrolled state, progress bar, mobile menu, section highlight
(() => {
  const nav = $(".nav"), bar = $(".progress"), links = $("#navLinks"), btn = $<HTMLButtonElement>(".menu-btn");
  let t = false;
  const up = () => {
    t = false;
    nav?.classList.toggle("scrolled", scrollY > 8);
    const h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
  };
  addEventListener("scroll", () => { if (!t) { t = true; requestAnimationFrame(up); } }, { passive: true });
  up();
  btn?.addEventListener("click", () => { const o = links!.classList.toggle("open"); btn.setAttribute("aria-expanded", String(o)); });
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => links!.classList.remove("open")));
  const spy = $$<HTMLAnchorElement>('#navLinks a[href^="#"]');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    spy.forEach((a) => (a.getAttribute("href") === "#" + e.target.id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
  }), { rootMargin: "-45% 0px -50% 0px" });
  spy.forEach((a) => { const s = document.getElementById(a.getAttribute("href")!.slice(1)); if (s) io.observe(s); });
  addEventListener("scroll", () => { if (scrollY < 300) spy.forEach((a) => a.removeAttribute("aria-current")); }, { passive: true });
})();

// waitlist forms (preview: validates and confirms, stores nothing)
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
$$<HTMLFormElement>("form.waitlist-inline, form.joined").forEach((f) => f.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('input[type="email"]', f)!, note = ($(".form-note", f) || $(".form-note", f.parentElement!))!, btn = $<HTMLButtonElement>("button", f)!;
  const email = input.value.trim().toLowerCase();
  note.classList.remove("ok");
  if (!EMAIL.test(email)) { note.textContent = "Enter a valid work email, like name@company.com."; input.focus(); return; }
  btn.disabled = true;
  setTimeout(() => { btn.disabled = false; note.textContent = `You're on the list. We'll write to ${email} when your batch opens.`; note.classList.add("ok"); f.reset(); }, 450);
}));

// copy buttons
$$<HTMLButtonElement>("button.copy").forEach((b) => {
  const icon = b.innerHTML;
  const tick = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>';
  b.addEventListener("click", async () => {
    const txt = (b.previousElementSibling as HTMLElement)?.textContent || "";
    let ok = true;
    try { await navigator.clipboard.writeText(txt); } catch { ok = false; }
    b.dataset.tip = ok ? "Copied" : "Select and copy";
    if (ok) { b.innerHTML = tick; b.classList.add("ok"); }
    setTimeout(() => { b.innerHTML = icon; b.classList.remove("ok"); b.dataset.tip = "Copy"; }, 1600);
  });
});

// 3D building: floor pulse + pointer tilt
(() => {
  const el = $(".h3d"); if (!el || reduce) return;
  const slabs = $$(".slab", el); let step = 0, on = true;
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(el);
  setInterval(() => { if (!on || document.hidden) return; const k = step++ % (slabs.length + 1); slabs.forEach((s, i) => s.classList.toggle("on", i === k)); }, 1100);
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const sec = el.closest("section") || el; let tx = 0, ty = 0, gx = 0, gy = 0, raf = 0;
  const loop = () => { tx += (gx - tx) * .08; ty += (gy - ty) * .08; el.style.setProperty("--tx", tx.toFixed(2) + "deg"); el.style.setProperty("--ty", ty.toFixed(2) + "deg"); el.style.setProperty("--px", (tx / 10).toFixed(3)); el.style.setProperty("--py", (ty / -5).toFixed(3)); raf = Math.abs(gx - tx) > .02 || Math.abs(gy - ty) > .02 ? requestAnimationFrame(loop) : 0; };
  sec.addEventListener("pointermove", (e) => { const ev = e as PointerEvent, r = el.getBoundingClientRect(); gx = Math.max(-1, Math.min(1, (ev.clientX - (r.left + r.width / 2)) / (innerWidth / 2))) * 10; gy = Math.max(-1, Math.min(1, (ev.clientY - (r.top + r.height / 2)) / (innerHeight / 2))) * -5; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  sec.addEventListener("pointerleave", () => { gx = 0; gy = 0; if (!raf) raf = requestAnimationFrame(loop); });
})();

// Ask Shellkore (preview answers from the page's FAQ; the live site uses the AI model)
(() => {
  const fab = $<HTMLButtonElement>(".ask-fab"); if (!fab) return;
  const faq = $$("details", $(".qa") || document).map((d) => ({ q: $("summary", d)?.textContent || "", a: $("p", d)?.textContent || "" }));
  const onS = () => { const away = scrollY < innerHeight * .7 && !panel; fab.classList.toggle("away", away); fab.tabIndex = away ? -1 : 0; };
  let panel: HTMLElement | null = null;
  addEventListener("scroll", onS, { passive: true }); onS();
  const answer = (q: string) => {
    const s = " " + q.toLowerCase().replace(/[?.!,]/g, " ") + " ";
    let best = "", score = 0;
    for (const f of faq) { const w = f.q.toLowerCase().replace(/[?.!,]/g, " ").split(/\s+/).filter((x) => x.length > 3); const sc = w.filter((x) => s.includes(" " + x)).length; if (sc > score) { score = sc; best = f.a; } }
    if (/price|pricing|cost|plan/.test(s)) best = "Pricing isn't public yet. Founding members from the waitlist get early access and founding-member pricing.";
    return best || "I can answer questions about what Shellkore does, who it's for, launch and pricing. For anything else, write to core@techfnatic.com.";
  };
  const close = () => { panel?.remove(); panel = null; fab.setAttribute("aria-expanded", "false"); onS(); fab.focus(); };
  fab.addEventListener("click", () => {
    if (panel) return close();
    panel = document.createElement("div");
    panel.className = "ask"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Ask Shellkore");
    panel.innerHTML = `<header><div><b>Ask Shellkore</b><small>Answers about Shellkore</small></div><button class="x" type="button" aria-label="Close assistant"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></header><div class="ask-log" role="log" aria-live="polite"></div><div class="suggest"></div><form><label class="hp" for="askIn">Your question</label><input id="askIn" maxlength="300" autocomplete="off" placeholder="Ask about features, launch, pricing"><button type="submit" aria-label="Send"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg></button></form>`;
    document.body.appendChild(panel);
    const log = $(".ask-log", panel)!, input = $<HTMLInputElement>("input", panel)!;
    const say = (t: string, me = false) => { const d = document.createElement("div"); d.className = "bub" + (me ? " me" : ""); d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; };
    const ask = (q: string) => { q = q.trim().slice(0, 300); if (!q) return; say(q, true); $(".suggest", panel!)!.innerHTML = ""; setTimeout(() => say(answer(q)), reduce ? 0 : 500); };
    say("Hi! Ask me anything about Shellkore, or pick a question below.");
    ["What is Shellkore?", "How does photo-to-BOQ work?", "Do clients need an app?", "When does it launch?"].forEach((s) => { const b = document.createElement("button"); b.type = "button"; b.textContent = s; b.onclick = () => ask(s); $(".suggest", panel!)!.appendChild(b); });
    $(".x", panel)!.addEventListener("click", close);
    $("form", panel)!.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); input.value = ""; });
    fab.setAttribute("aria-expanded", "true"); fab.classList.remove("away"); input.focus();
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && panel) close(); });
})();
