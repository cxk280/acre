// Static catalog of what a tenant can be provisioned with: regions, models,
// and fractional-GPU slice sizes. Kept separate from cost math (rates.ts) and
// from the mutable store so it can be imported by both server and client.

import type { SliceSize } from "./types";

export interface Region {
  code: string;
  /** City, e.g. "Amsterdam". Shown as the tenant's region. */
  label: string;
  continent: string;
  country: string;
  /** No free A16 slices right now — provisioning here fails (demoes capacity). */
  atCapacity?: boolean;
}

// The full set of Vultr regions (source: Vultr /v2/regions). New Jersey (ewr) is
// first so it's the provisioning default. Bangalore is flagged at-capacity to demo
// the failure/retry flow.
export const REGIONS: Region[] = [
  // North America
  { code: "ewr", label: "New Jersey", continent: "North America", country: "US" },
  { code: "ord", label: "Chicago", continent: "North America", country: "US" },
  { code: "dfw", label: "Dallas", continent: "North America", country: "US" },
  { code: "sea", label: "Seattle", continent: "North America", country: "US" },
  { code: "lax", label: "Los Angeles", continent: "North America", country: "US" },
  { code: "atl", label: "Atlanta", continent: "North America", country: "US" },
  { code: "mia", label: "Miami", continent: "North America", country: "US" },
  { code: "sjc", label: "Silicon Valley", continent: "North America", country: "US" },
  { code: "hnl", label: "Honolulu", continent: "North America", country: "US" },
  { code: "yto", label: "Toronto", continent: "North America", country: "CA" },
  { code: "mex", label: "Mexico City", continent: "North America", country: "MX" },
  // Europe
  { code: "ams", label: "Amsterdam", continent: "Europe", country: "NL" },
  { code: "lhr", label: "London", continent: "Europe", country: "GB" },
  { code: "man", label: "Manchester", continent: "Europe", country: "GB" },
  { code: "fra", label: "Frankfurt", continent: "Europe", country: "DE" },
  { code: "cdg", label: "Paris", continent: "Europe", country: "FR" },
  { code: "mad", label: "Madrid", continent: "Europe", country: "ES" },
  { code: "mxp", label: "Milan", continent: "Europe", country: "IT" },
  { code: "waw", label: "Warsaw", continent: "Europe", country: "PL" },
  { code: "sto", label: "Stockholm", continent: "Europe", country: "SE" },
  // Asia
  { code: "nrt", label: "Tokyo", continent: "Asia", country: "JP" },
  { code: "itm", label: "Osaka", continent: "Asia", country: "JP" },
  { code: "icn", label: "Seoul", continent: "Asia", country: "KR" },
  { code: "sgp", label: "Singapore", continent: "Asia", country: "SG" },
  { code: "blr", label: "Bangalore", continent: "Asia", country: "IN", atCapacity: true },
  { code: "del", label: "Delhi NCR", continent: "Asia", country: "IN" },
  { code: "bom", label: "Mumbai", continent: "Asia", country: "IN" },
  { code: "tlv", label: "Tel Aviv", continent: "Asia", country: "IL" },
  // Australia
  { code: "syd", label: "Sydney", continent: "Australia", country: "AU" },
  { code: "mel", label: "Melbourne", continent: "Australia", country: "AU" },
  // South America
  { code: "sao", label: "São Paulo", continent: "South America", country: "BR" },
  { code: "scl", label: "Santiago", continent: "South America", country: "CL" },
  // Africa
  { code: "jnb", label: "Johannesburg", continent: "Africa", country: "ZA" },
];

/** Regions grouped by continent, preserving order — for grouped dropdowns. */
export function regionsByContinent(): { continent: string; regions: Region[] }[] {
  const groups: { continent: string; regions: Region[] }[] = [];
  for (const region of REGIONS) {
    let group = groups.find((g) => g.continent === region.continent);
    if (!group) {
      group = { continent: region.continent, regions: [] };
      groups.push(group);
    }
    group.regions.push(region);
  }
  return groups;
}

export function isRegionAtCapacity(code: string): boolean {
  return regionByCode(code)?.atCapacity === true;
}

export const MODELS = [
  "Llama-3-8B",
  "Mistral-7B",
  "Phi-3-mini",
  "Qwen2-7B",
] as const;

export type Model = (typeof MODELS)[number];

export interface SliceOption {
  size: SliceSize;
  /** Accelerator family, e.g. "A16". */
  accelerator: string;
  /** Fraction glyph for display, e.g. "⅛". */
  fraction: string;
  /** MIG/vGPU profile identifier used in the isolation badge. */
  migProfile: string;
  /** GPU memory of the slice. */
  memory: string;
  ratePerHour: number;
}

/** Cheapest first — the UI preselects SLICE_OPTIONS[0]. */
export const SLICE_OPTIONS: SliceOption[] = [
  {
    size: "a16-1_8",
    accelerator: "A16",
    fraction: "⅛",
    migProfile: "mig-1g.5gb",
    memory: "5 GB",
    ratePerHour: 0.03,
  },
  {
    size: "a16-1_4",
    accelerator: "A16",
    fraction: "¼",
    migProfile: "mig-2g.10gb",
    memory: "10 GB",
    ratePerHour: 0.06,
  },
  {
    size: "a16-1_2",
    accelerator: "A16",
    fraction: "½",
    migProfile: "mig-3g.20gb",
    memory: "20 GB",
    ratePerHour: 0.12,
  },
];

export function sliceOption(size: SliceSize): SliceOption {
  const found = SLICE_OPTIONS.find((s) => s.size === size);
  if (!found) throw new Error(`Unknown slice size: ${size}`);
  return found;
}

export function regionByCode(code: string): Region | undefined {
  return REGIONS.find((r) => r.code === code);
}
