import { beforeEach, describe, expect, it } from "vitest";
import { MockProvisioner } from "@/lib/provisioner/mock";
import {
  createInMemoryTenantRepository,
  type TenantRepository,
} from "@/lib/store/tenant-repository";

function provisioner(repo: TenantRepository) {
  return new MockProvisioner(repo, { schedule: (fn) => fn(), now: () => 1000 });
}

describe("MockProvisioner — capacity failure + retry", () => {
  let repo: TenantRepository;
  beforeEach(() => {
    repo = createInMemoryTenantRepository();
  });

  it("fails at the slice step when the region is at capacity", () => {
    const t = repo.create({
      name: "Harbor",
      regionCode: "blr", // Bangalore is marked atCapacity
      sliceSize: "a16-1_8",
      model: "Llama-3-8B",
    });
    provisioner(repo).provision(t.id);

    const after = repo.get(t.id)!;
    expect(after.status).toBe("failed");
    expect(after.failure?.step).toBe("slice");
    expect(after.failure?.message).toMatch(/no free a16 slices/i);
    // Nothing was reserved or billed.
    expect(after.isolation.gpuSlice.confirmed).toBe(false);
    expect(after.billingStartedAt).toBeNull();
  });

  it("succeeds on retry into a region with capacity", () => {
    const t = repo.create({
      name: "Harbor",
      regionCode: "blr",
      sliceSize: "a16-1_8",
      model: "Llama-3-8B",
    });
    const prov = provisioner(repo);
    prov.provision(t.id);
    expect(repo.get(t.id)!.status).toBe("failed");

    prov.retry(t.id, "ewr"); // move to Ashburn and retry
    const after = repo.get(t.id)!;
    expect(after.status).toBe("running");
    expect(after.failure).toBeNull();
    expect(after.region).toBe("US-East · Ashburn");
    expect(after.isolation.gpuSlice.confirmed).toBe(true);
    expect(after.endpointUrl).toBe(`https://${t.id}.acre.io/v1`);
  });

  it("fails again on retry into the same capacity-constrained region", () => {
    const t = repo.create({
      name: "Harbor",
      regionCode: "blr",
      sliceSize: "a16-1_8",
      model: "Llama-3-8B",
    });
    const prov = provisioner(repo);
    prov.provision(t.id);
    prov.retry(t.id); // no region change → still Bangalore
    expect(repo.get(t.id)!.status).toBe("failed");
  });
});
