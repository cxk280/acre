// Static catalog of what a tenant can be provisioned with: regions, models,
// and fractional-GPU slice sizes. Kept separate from cost math (rates.ts) and
// from the mutable store so it can be imported by both server and client.

import type { SliceSize } from "./types";

export interface Region {
  code: string;
  label: string;
  /** No free A16 slices right now — provisioning here fails (demoes capacity). */
  atCapacity?: boolean;
}

export const REGIONS: Region[] = [
  { code: "ewr", label: "US-East · Ashburn" },
  { code: "ams", label: "EU-West · Amsterdam" },
  { code: "sjc", label: "US-West · Silicon Valley" },
  { code: "lhr", label: "EU-West · London" },
  { code: "blr", label: "AP-South · Bangalore", atCapacity: true },
];

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
