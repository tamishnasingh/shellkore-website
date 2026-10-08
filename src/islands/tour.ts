import { tabs } from "./tabs";
export function mount(root: HTMLElement): () => void {
  const list = Array.from(root.querySelectorAll<HTMLElement>(".tour-tab"));
  const views = Array.from(root.querySelectorAll<HTMLElement>(".tview"));
  const copies = Array.from(root.querySelectorAll<HTMLElement>("[data-copy]"));
  const url = root.querySelector<HTMLElement>("[data-url]");
  const bars = list.map((t) => t.querySelector<HTMLElement>("i b")!).filter(Boolean);
  return tabs({
    tabs: list, bars, ms: 6000, root,
    onSelect: (i) => {
      views.forEach((v, k) => v.classList.toggle("on", k === i));
      copies.forEach((c, k) => c.classList.toggle("on", k === i));
      if (url && views[i]?.dataset.url) url.textContent = views[i].dataset.url!;
    },
  });
}
