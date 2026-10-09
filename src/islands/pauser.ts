/**
 * Pauses every decorative CSS loop while its section is off screen (data-off on the section), so the
 * browser only animates what can be seen. One observer for the whole page.
 */
export function mount(): () => void {
  const targets = Array.from(document.querySelectorAll<HTMLElement>("main section, footer"));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.toggleAttribute("data-off", !e.isIntersecting);
  }, { rootMargin: "150px 0px" });
  targets.forEach((t) => io.observe(t));
  return () => io.disconnect();
}
