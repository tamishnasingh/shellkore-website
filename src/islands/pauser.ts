/**
 * Pauses every CSS animation in a section while it is off screen, and resumes it on the way back.
 * The pause is done through the Web Animations API: a CSS rule alone isn't enough, because the browser
 * skips restyling off-screen sections (content-visibility), so it would never see the rule apply.
 */
export function mount(): () => void {
  const targets = Array.from(document.querySelectorAll<HTMLElement>("main section, footer"));
  const paused = new Map<Element, Animation[]>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      el.toggleAttribute("data-off", !e.isIntersecting);
      if (!e.isIntersecting) {
        const list = el.getAnimations({ subtree: true }).filter((a) => a.playState === "running" && a.effect && (a.effect as KeyframeEffect).getComputedTiming().iterations === Infinity);
        list.forEach((a) => a.pause());
        paused.set(el, list);
      } else {
        paused.get(el)?.forEach((a) => { try { a.play(); } catch { /* removed */ } });
        paused.delete(el);
      }
    }
  }, { rootMargin: "150px 0px" });
  targets.forEach((t) => io.observe(t));
  return () => { io.disconnect(); paused.forEach((l) => l.forEach((a) => { try { a.play(); } catch { /* removed */ } })); };
}
