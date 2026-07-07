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
}

// The full set of Vultr regions (source: Vultr /v2/regions). New Jersey (ewr) is
// first so it's the provisioning default. Every region provisions by default; to
// demo the capacity-failure/retry flow, set ACRE_CAPACITY_REGIONS (see below).
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
  { code: "blr", label: "Bangalore", continent: "Asia", country: "IN" },
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

// Capacity failure is opt-in via env (comma-separated region codes), so by
// default every region provisions successfully. e.g. ACRE_CAPACITY_REGIONS=blr
// makes Bangalore fail, to demo the failure/retry flow. Server-side only.
export function isRegionAtCapacity(code: string): boolean {
  const list = process.env.ACRE_CAPACITY_REGIONS;
  if (!list) return false;
  return list
    .split(",")
    .map((c) => c.trim())
    .includes(code);
}

export interface ModelOption {
  /** Provider model id sent to inference (a real Vultr Serverless model). */
  id: string;
  /** Friendly display name. */
  label: string;
}

// Real Vultr Serverless Inference chat models — fast, non-reasoning ones verified
// to return clean answers. The chosen id is sent straight through to Vultr.
export const MODELS: ModelOption[] = [
  { id: "deepseek-ai/DeepSeek-V4-Flash", label: "DeepSeek V4 Flash" },
  { id: "MiniMaxAI/MiniMax-M2.7", label: "MiniMax M2.7" },
];

export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}

export interface SliceOption {
  size: SliceSize;
  /** Accelerator family, e.g. "A16". */
  accelerator: string;
  /** Fraction glyph for display, e.g. "⅛". */
  fraction: string;
  /** vGPU profile label used in the isolation badge. */
  migProfile: string;
  /** GPU memory of the slice. */
  memory: string;
  /**
   * The real Vultr fractional-GPU plan id this slice provisions (verified via
   * GET /v2/plans). The VultrProvisioner boots this exact plan, so the cost meter
   * reflects what is actually billed — not an illustrative number.
   */
  plan: string;
  ratePerHour: number;
}

// A Vultr A16 is a 16 GB card; these are its real, API-provisionable vGPU slices
// (vram-sliced, not MIG). ⅛/¼/½ = 2/4/8 GB of the 16 GB card. Hourly ≈ monthly÷730
// ($43/$86/$172 → ~$0.06/$0.12/$0.24), all comfortably under the $0.50 ceiling.
/** Cheapest first — the UI preselects SLICE_OPTIONS[0]. */
export const SLICE_OPTIONS: SliceOption[] = [
  {
    size: "a16-1_8",
    accelerator: "A16",
    fraction: "⅛",
    migProfile: "A16 · 2 GB vGPU",
    memory: "2 GB",
    plan: "vcg-a16-2c-8g-2vram",
    ratePerHour: 0.06,
  },
  {
    size: "a16-1_4",
    accelerator: "A16",
    fraction: "¼",
    migProfile: "A16 · 4 GB vGPU",
    memory: "4 GB",
    plan: "vcg-a16-2c-16g-4vram",
    ratePerHour: 0.12,
  },
  {
    size: "a16-1_2",
    accelerator: "A16",
    fraction: "½",
    migProfile: "A16 · 8 GB vGPU",
    memory: "8 GB",
    plan: "vcg-a16-3c-32g-8vram",
    ratePerHour: 0.24,
  },
];

// The regions that actually carry the small A16 slices (GET /v2/plans →
// vcg-a16-2c-8g-2vram.locations). The real provisioner validates against this so a
// tenant in an unsupported region fails cleanly instead of erroring mid-provision.
export const GPU_SLICE_REGIONS: readonly string[] = [
  "ewr",
  "ord",
  "atl",
  "lhr",
  "fra",
  "sjc",
  "nrt",
  "sgp",
  "blr",
];

/** Is the small A16 fractional slice available in this region? */
export function regionHasGpuSlice(code: string): boolean {
  return GPU_SLICE_REGIONS.includes(code);
}

export function sliceOption(size: SliceSize): SliceOption {
  const found = SLICE_OPTIONS.find((s) => s.size === size);
  if (!found) throw new Error(`Unknown slice size: ${size}`);
  return found;
}

export function regionByCode(code: string): Region | undefined {
  return REGIONS.find((r) => r.code === code);
}
