import { tabs } from "./tabs";
export function mount(root: HTMLElement): () => void {
  const list = Array.from(root.querySelectorAll<HTMLElement>(".how-step"));
  const scenes = Array.from(root.querySelectorAll<HTMLElement>(".scene"));
  const bars = list.map((t) => t.querySelector<HTMLElement>(".bar i")!).filter(Boolean);
  return tabs({ tabs: list, bars, ms: 5500, root, onSelect: (i) => scenes.forEach((s, k) => s.classList.toggle("on", k === i)) });
}
