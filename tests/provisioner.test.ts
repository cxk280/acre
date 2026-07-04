import { beforeEach, describe, expect, it } from "vitest";
import { MockProvisioner } from "@/lib/provisioner/mock";
import {
  createInMemoryTenantRepository,
  type TenantRepository,
} from "@/lib/store/tenant-repository";

// An immediate scheduler runs the whole state machine synchronously, so we can
// assert the settled result without real timers.
function newProvisioner(repo: TenantRepository) {
  return new MockProvisioner(repo, {
    schedule: (fn) => fn(),
    now: () => 1000,
  });
}

describe("MockProvisioner", () => {
  let repo: TenantRepository;

  beforeEach(() => {
    repo = createInMemoryTenantRepository();
  });

  it("provisions a tenant to running with full isolation and an endpoint", () => {
    const created = repo.create({
      name: "Harbor Free Clinic",
      regionCode: "ewr",
      sliceSize: "a16-1_8",
      model: "Llama-3-8B",
    });
    newProvisioner(repo).provision(created.id);

    const t = repo.get(created.id)!;
    expect(t.status).toBe("running");
    expect(t.currentStep).toBeNull();
    expect(t.completedSteps).toEqual([
      "slice",
      "vpc",
      "bucket",
      "endpoint",
      "live",
    ]);
    expect(t.isolation.gpuSlice.confirmed).toBe(true);
    expect(t.isolation.vpc.confirmed).toBe(true);
    expect(t.isolation.bucket.confirmed).toBe(true);
    expect(t.endpointUrl).toBe("https://tnt-4471.acre.io/v1");
    expect(t.billingStartedAt).toBe(1000);
    expect(t.provisionedAt).toBe(1000);
  });

  it("stops billing on teardown after the endpoint is live", () => {
    const created = repo.create({
      name: "Northgate",
      regionCode: "ams",
      sliceSize: "a16-1_4",
      model: "Mistral-7B",
    });
    const prov = newProvisioner(repo);
    prov.provision(created.id);
    prov.teardown(created.id);

    const t = repo.get(created.id)!;
    expect(t.status).toBe("stopped");
    expect(t.endpointUrl).toBeNull();
    expect(t.billingStoppedAt).toBe(1000);
  });

  it("aborts provisioning if the tenant is torn down mid-flight", () => {
    const created = repo.create({
      name: "Coastal",
      regionCode: "sjc",
      sliceSize: "a16-1_8",
      model: "Llama-3-8B",
    });
    // Only advance one step per tick so we can interrupt.
    const steps: (() => void)[] = [];
    const prov = new MockProvisioner(repo, {
      schedule: (fn) => steps.push(fn),
      now: () => 1000,
    });
    prov.provision(created.id); // queues the first step's completion
    prov.teardown(created.id); // mark tearing_down before it runs
    steps.forEach((fn) => fn()); // flush any queued step completions

    const t = repo.get(created.id)!;
    // Never reaches running; teardown wins.
    expect(t.status).not.toBe("running");
    expect(["tearing_down", "stopped"]).toContain(t.status);
  });
});
