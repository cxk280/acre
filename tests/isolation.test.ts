import { describe, expect, it } from "vitest";
import { createInMemoryTenantRepository } from "@/lib/store/tenant-repository";

// The core isolation promise: no two tenants ever share a GPU slice, a VPC
// (id or CIDR), or a bucket. This is what the admin "isolation matrix" proves
// visually; here we prove it holds for many tenants at once.
describe("per-tenant isolation uniqueness", () => {
  it("allocates distinct slice / vpc / cidr / bucket ids across many tenants", () => {
    const repo = createInMemoryTenantRepository();
    const slices = new Set<string>();
    const vpcs = new Set<string>();
    const cidrs = new Set<string>();
    const buckets = new Set<string>();
    const ids = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const t = repo.create({
        name: `Tenant ${i}`,
        regionCode: "ewr",
        sliceSize: "a16-1_8",
        model: "Llama-3-8B",
      });
      slices.add(t.isolation.gpuSlice.id);
      vpcs.add(t.isolation.vpc.id);
      cidrs.add(t.isolation.vpc.cidr);
      buckets.add(t.isolation.bucket.id);
      ids.add(t.id);
    }

    expect(ids.size).toBe(50);
    expect(slices.size).toBe(50);
    expect(vpcs.size).toBe(50);
    expect(cidrs.size).toBe(50);
    expect(buckets.size).toBe(50);
  });
});
