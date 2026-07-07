import { describe, expect, it } from "vitest";
import { SLICE_OPTIONS } from "@/lib/domain/catalog";
import {
  COST_CEILING_PER_HOUR,
  ceilingHeadroom,
  everySliceUnderCeiling,
  isUnderCeiling,
  liveSessionCost,
  sessionCost,
} from "@/lib/domain/rates";
import { createTenant } from "@/lib/domain/tenant-factory";
import type { Tenant } from "@/lib/domain/types";

describe("rates — the <$0.50/hr invariant", () => {
  it("every slice size prices strictly under the ceiling", () => {
    expect(everySliceUnderCeiling()).toBe(true);
    for (const slice of SLICE_OPTIONS) {
      expect(isUnderCeiling(slice.ratePerHour)).toBe(true);
      expect(slice.ratePerHour).toBeLessThan(COST_CEILING_PER_HOUR);
    }
  });

  it("headroom is between 0 and 1 and larger for cheaper slices", () => {
    const cheap = ceilingHeadroom(0.03);
    const dear = ceilingHeadroom(0.12);
    expect(cheap).toBeGreaterThan(dear);
    expect(cheap).toBeLessThanOrEqual(1);
    expect(dear).toBeGreaterThanOrEqual(0);
  });

  it("sessionCost accrues linearly and is zero for non-positive spans", () => {
    // $0.30/hr for exactly one hour = $0.30
    expect(sessionCost(0.3, 0, 60 * 60 * 1000)).toBeCloseTo(0.3, 6);
    expect(sessionCost(0.3, 100, 100)).toBe(0);
    expect(sessionCost(0.3, 200, 100)).toBe(0);
  });
});

describe("liveSessionCost", () => {
  const base = createTenant(
    { name: "Test", regionCode: "ewr", sliceSize: "a16-1_8", model: "Llama-3-8B" },
    0,
    0,
  );

  it("is zero before billing starts", () => {
    expect(liveSessionCost(base, 60 * 60 * 1000)).toBe(0);
  });

  it("accrues while billing is active", () => {
    const billing: Tenant = { ...base, billingStartedAt: 0 };
    // a16-1_8 = the real ~$0.06/hr 2 GB A16 vGPU slice.
    expect(liveSessionCost(billing, 60 * 60 * 1000)).toBeCloseTo(0.06, 6);
  });

  it("freezes at the teardown moment once billing has stopped", () => {
    const stopped: Tenant = {
      ...base,
      billingStartedAt: 0,
      billingStoppedAt: 60 * 60 * 1000,
    };
    // Even an hour later, cost is frozen at the one-hour mark.
    expect(liveSessionCost(stopped, 5 * 60 * 60 * 1000)).toBeCloseTo(0.06, 6);
  });
});
