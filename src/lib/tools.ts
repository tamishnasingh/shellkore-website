/**
 * Free construction tools: BOQ estimator, tiles, paint and home-loan EMI.
 * Pure functions, shared by the server render (first paint is already correct) and the browser island.
 * Rates are typical 2026 Indian ranges and thumb rules; the UI says so.
 */

export type ProjectType = "build" | "interiors" | "renovation" | "commercial";
export type Finish = "standard" | "premium" | "luxury";
export type City = "metro" | "tier2" | "tier3";

export const TYPES: { id: ProjectType; label: string; hint: string }[] = [
  { id: "build", label: "New construction", hint: "Built-up area, all floors" },
  { id: "interiors", label: "Interiors", hint: "Carpet area to be done up" },
  { id: "renovation", label: "Renovation", hint: "Area being renovated" },
  { id: "commercial", label: "Office fit-out", hint: "Carpet area of the office" },
];
export const FINISHES: { id: Finish; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "premium", label: "Premium" },
  { id: "luxury", label: "Luxury" },
];
export const CITIES: { id: City; label: string; k: number }[] = [
  { id: "metro", label: "Metro city", k: 1.1 },
  { id: "tier2", label: "Tier 2 city", k: 1.0 },
  { id: "tier3", label: "Tier 3 / town", k: 0.9 },
];

/** ₹ per sq ft, before the city factor. */
const RATE: Record<ProjectType, Record<Finish, number>> = {
  build: { standard: 1950, premium: 2550, luxury: 3600 },
  interiors: { standard: 1250, premium: 1950, luxury: 3100 },
  renovation: { standard: 750, premium: 1150, luxury: 1850 },
  commercial: { standard: 1650, premium: 2450, luxury: 3650 },
};

/** BOQ heads and their share of the total. */
const HEADS: Record<ProjectType, [string, number][]> = {
  build: [["Earthwork & foundation", 8], ["RCC frame: columns, beams, slabs", 30], ["Brickwork & plaster", 13], ["Flooring & tiling", 10], ["Doors & windows", 9], ["Plumbing & sanitary", 8], ["Electrical", 7], ["Painting & finishes", 7], ["Waterproofing", 3], ["Supervision & contingency", 5]],
  interiors: [["Wardrobes & storage", 20], ["Modular kitchen", 18], ["False ceiling & lighting", 12], ["Furniture & loose items", 12], ["Flooring", 10], ["Painting & wall finishes", 9], ["Bathroom upgrades", 8], ["Electrical", 6], ["Supervision & contingency", 5]],
  renovation: [["Flooring", 16], ["Bathrooms", 16], ["Civil repairs", 14], ["Painting", 13], ["Waterproofing", 10], ["Electrical rewiring", 10], ["Plumbing", 10], ["Demolition & debris", 6], ["Supervision & contingency", 5]],
  commercial: [["Partitions & ceilings", 22], ["Furniture & workstations", 18], ["HVAC", 16], ["Electrical & lighting", 15], ["Flooring", 12], ["Fire & safety", 6], ["Networking & AV", 6], ["Supervision & contingency", 5]],
};

const MILESTONES: Record<ProjectType, [string, number][]> = {
  build: [["Booking", 10], ["Foundation", 15], ["Structure", 30], ["Masonry", 15], ["Finishes", 20], ["Handover", 10]],
  interiors: [["Booking", 10], ["Design sign-off", 40], ["Materials on site", 30], ["Handover", 20]],
  renovation: [["Booking", 15], ["Civil work", 35], ["Finishes", 35], ["Handover", 15]],
  commercial: [["Booking", 10], ["Design sign-off", 30], ["Build-out", 40], ["Handover", 20]],
};

export type BoqInput = { type: ProjectType; area: number; finish: Finish; city: City };
export type BoqResult = {
  total: number; low: number; high: number; perSqft: number; weeks: number;
  lines: { name: string; amount: number; share: number }[];
  milestones: { name: string; amount: number; share: number }[];
  materials: { name: string; qty: string }[];
};

const fmtN = (n: number) => Math.round(n).toLocaleString("en-IN");

export function boq({ type, area, finish, city }: BoqInput): BoqResult {
  const a = Math.max(100, Math.min(100000, area || 0));
  const k = CITIES.find((c) => c.id === city)?.k ?? 1;
  const perSqft = Math.round(RATE[type][finish] * k);
  const total = perSqft * a;
  const lines = HEADS[type].map(([name, share]) => ({ name, share, amount: (total * share) / 100 }));
  const milestones = MILESTONES[type].map(([name, share]) => ({ name, share, amount: (total * share) / 100 }));
  const weeks = Math.round(
    type === "build" ? 16 + a * 0.012 : type === "interiors" ? 4 + a * 0.004 : type === "renovation" ? 3 + a * 0.005 : 6 + a * 0.003,
  );
  // thumb-rule quantities (per sq ft of built-up area) for civil work
  const civil = type === "build" ? 1 : type === "renovation" ? 0.25 : 0;
  const materials = civil
    ? [
        { name: "Cement", qty: `${fmtN(a * 0.4 * civil)} bags` },
        { name: "Steel", qty: `${(a * 4 * civil / 1000).toFixed(1)} t` },
        { name: "Sand", qty: `${fmtN(a * 1.8 * civil)} cft` },
        { name: "Aggregate", qty: `${fmtN(a * 1.35 * civil)} cft` },
        { name: "Bricks", qty: `${fmtN(a * 8 * civil)}` },
        { name: "Paint", qty: `${fmtN(a * 0.18)} L` },
      ]
    : [
        { name: "Plywood (BWP)", qty: `${fmtN(a * (type === "commercial" ? 0.35 : 0.55))} sq ft` },
        { name: "Laminate", qty: `${fmtN(a * (type === "commercial" ? 0.4 : 0.7))} sq ft` },
        { name: "Gypsum ceiling", qty: `${fmtN(a * 0.6)} sq ft` },
        { name: "Paint", qty: `${fmtN(a * 0.18)} L` },
        { name: "Wiring", qty: `${fmtN(a * 0.9)} m` },
        { name: "Light points", qty: `${fmtN(a / 45)}` },
      ];
  return { total, low: total * 0.9, high: total * 1.12, perSqft, weeks, lines, milestones, materials };
}

/* ---- tiles ---- */
export const TILE_SIZES: { id: string; label: string; w: number; h: number; perBox: number }[] = [
  { id: "600x600", label: "600 × 600 mm", w: 600, h: 600, perBox: 4 },
  { id: "800x800", label: "800 × 800 mm", w: 800, h: 800, perBox: 3 },
  { id: "600x1200", label: "600 × 1200 mm", w: 600, h: 1200, perBox: 2 },
  { id: "300x600", label: "300 × 600 mm (wall)", w: 300, h: 600, perBox: 8 },
];
export function tiles(lengthFt: number, widthFt: number, sizeId: string, wastagePct: number) {
  const s = TILE_SIZES.find((t) => t.id === sizeId) ?? TILE_SIZES[0];
  const area = Math.max(0, lengthFt) * Math.max(0, widthFt);
  const tileSqft = (s.w / 304.8) * (s.h / 304.8);
  const count = Math.ceil((area * (1 + Math.max(0, wastagePct) / 100)) / tileSqft);
  const boxes = Math.ceil(count / s.perBox);
  const skirting = Math.round(2 * (Math.max(0, lengthFt) + Math.max(0, widthFt)));
  return { area, count, boxes, skirting, perBox: s.perBox };
}

/* ---- paint ---- */
export function paint(lengthFt: number, widthFt: number, heightFt: number, doors: number, windows: number, coats: number, ceiling: boolean) {
  const walls = 2 * (Math.max(0, lengthFt) + Math.max(0, widthFt)) * Math.max(0, heightFt);
  const openings = Math.max(0, doors) * 21 + Math.max(0, windows) * 15;
  const area = Math.max(0, walls - openings) + (ceiling ? Math.max(0, lengthFt) * Math.max(0, widthFt) : 0);
  const paintL = (area * Math.max(1, coats)) / 110; // interior emulsion, ~110 sq ft per litre per coat
  const primerL = area / 100;
  const puttyKg = area / 18; // two thin coats of wall putty
  return { area, paintL, primerL, puttyKg };
}

/* ---- EMI ---- */
export function emi(principal: number, ratePct: number, years: number) {
  const P = Math.max(0, principal), n = Math.max(1, Math.round(years * 12)), r = Math.max(0, ratePct) / 1200;
  const m = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return { emi: m, total: m * n, interest: m * n - P };
}

export function rupees(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 1 : 2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 1 : 2)} L`;
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
