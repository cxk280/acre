// Cost math. The product's central promise is "well under $0.50/hr", so the
// ceiling is a first-class constant and `isUnderCeiling` is asserted in tests
// across every slice size (see tests/rates.test.ts).

import { SLICE_OPTIONS, sliceOption } from "./catalog";
import type { SliceSize, Tenant } from "./types";

/** The hero ceiling every tenant's live rate must stay below. */
export const COST_CEILING_PER_HOUR = 0.5;

const MS_PER_HOUR = 60 * 60 * 1000;

export function ratePerHour(size: SliceSize): number {
  return sliceOption(size).ratePerHour;
}

export function isUnderCeiling(rate: number): boolean {
  return rate < COST_CEILING_PER_HOUR;
}

/** How far below the ceiling a rate sits, as a 0..1 fraction (for meter fill). */
export function ceilingHeadroom(rate: number): number {
  return Math.max(0, Math.min(1, 1 - rate / COST_CEILING_PER_HOUR));
}

/** Accrued session cost for a rate running from `fromMs` to `toMs`. */
export function sessionCost(rate: number, fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  return (rate * (toMs - fromMs)) / MS_PER_HOUR;
}

/** Sanity guard: no slice may ever price at or above the ceiling. */
export function everySliceUnderCeiling(): boolean {
  return SLICE_OPTIONS.every((s) => isUnderCeiling(s.ratePerHour));
}

/** Projected daily saving from tearing a tenant down (its $/hr × 24h). */
export function dailySavings(ratePerHour: number): number {
  return ratePerHour * 24;
}

/** Is a tenant currently accruing cost (billing started, not yet stopped)? */
export function isBillingActive(tenant: Tenant): boolean {
  return tenant.billingStartedAt != null && tenant.billingStoppedAt == null;
}

/**
 * Accrued session cost so far. Zero before the slice is reserved; frozen at the
 * teardown moment once billing has stopped.
 */
export function liveSessionCost(tenant: Tenant, nowMs: number): number {
  if (tenant.billingStartedAt == null) return 0;
  const end = tenant.billingStoppedAt ?? nowMs;
  return sessionCost(tenant.ratePerHour, tenant.billingStartedAt, end);
}
