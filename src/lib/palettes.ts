/** Palette preview options (tokens in globals.css; picked with components/PaletteSwitcher). */
export const PALETTES = [
  { id: "", name: "Current", swatch: ["#F7F6F2", "#16150F", "#E4ECF3"] },
  { id: "terracota", name: "Terracota", swatch: ["#974315", "#E3D6C5", "#788990", "#8D957E"] },
  { id: "terra", name: "Terra Queimada", swatch: ["#754437", "#D3C7AD", "#28374A", "#6B6751"] },
  { id: "tobacco", name: "Tobacco", swatch: ["#584738", "#B59E7D", "#CEC1A8", "#AAA396"] },
] as const;

export const PALETTE_KEY = "sk-palette";
const IDS = PALETTES.map((p) => p.id).filter(Boolean);

/** Runs before first paint (inline in the layout), so the page never flashes the default colours. */
export const PALETTE_BOOT = `(function(){try{var ids=${JSON.stringify(IDS)};var q=new URLSearchParams(location.search).get("palette");var p=q!==null?q:localStorage.getItem("${PALETTE_KEY}");if(q!==null)localStorage.setItem("${PALETTE_KEY}",q);if(p&&ids.indexOf(p)>=0)document.documentElement.dataset.palette=p;}catch(e){}})();`;
