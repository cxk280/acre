import { describe, expect, it } from "vitest";
import { computeFleetSummary } from "@/lib/domain/fleet";
import { createTenant } from "@/lib/domain/tenant-factory";
import type { Tenant } from "@/lib/domain/types";

function tenant(i: number, over: Partial<Tenant> = {}): Tenant {
  const base = createTenant(
    { name: `T${i}`, regionCode: i % 2 ? "ams" : "ewr", sliceSize: "a16-1_8", model: "Llama-3-8B" },
    i,
    0,
  );
  return { ...base, ...over };
}

describe("computeFleetSummary", () => {
  it("summarizes an empty fleet as all zeros", () => {
    const s = computeFleetSummary([]);
    expect(s).toEqual({
      activeTenants: 0,
      runningTenants: 0,
      idleTenants: 0,
      fleetRatePerHour: 0,
      regions: [],
      sliceCount: 0,
    });
  });

  it("counts active tenants, sums billing rate, and dedups regions", () => {
    const tenants = [
      tenant(0, { status: "running", billingStartedAt: 0 }), // ewr, billing
      tenant(1, { status: "running", billingStartedAt: 0 }), // ams, billing
      tenant(2, { status: "idle", billingStartedAt: 0 }), // ewr, billing
      tenant(3, { status: "provisioning" }), // ewr, not yet billing
      tenant(4, { status: "stopped", billingStartedAt: 0, billingStoppedAt: 1 }), // excluded
    ];
    const s = computeFleetSummary(tenants);
    expect(s.activeTenants).toBe(4); // all but the stopped one
    expect(s.runningTenants).toBe(2);
    expect(s.idleTenants).toBe(1);
    // three billing tenants at $0.03 each
    expect(s.fleetRatePerHour).toBeCloseTo(0.09, 6);
    expect(s.fleetRatePerHour).toBeLessThan(0.5 * 4);
    expect(s.regions.sort()).toEqual(["EU-West · Amsterdam", "US-East · Ashburn"]);
    expect(s.sliceCount).toBe(4);
  });
});
