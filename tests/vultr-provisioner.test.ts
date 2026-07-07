import { beforeEach, describe, expect, it } from "vitest";
import { VultrProvisioner } from "@/lib/provisioner/vultr";
import type { FetchLike } from "@/lib/provisioner/vultr-api";
import {
  createInMemoryTenantRepository,
  type TenantRepository,
} from "@/lib/store/tenant-repository";

const TAG = "acre-managed";
const INSTANCE_ID = "11111111-2222-3333-4444-555555555555";
const VPC_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const IP = "192.0.2.10";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface FakeCfg {
  create402?: boolean;
  ollamaOk?: boolean;
  /** When false, /api/tags responds 200 but the model isn't pulled yet. */
  modelReady?: boolean;
  /** When true, the first GET /instances/{id} returns a transient 429. */
  instanceGetFailFirst?: boolean;
  instanceTagged?: boolean;
  managed?: { id: string; tags: string[] }[];
}

function fakeVultr(cfg: FakeCfg = {}) {
  const calls: { method: string; url: string }[] = [];
  let deleted = false;
  let getFailedOnce = false;

  const instance = () => ({
    id: INSTANCE_ID,
    status: "active",
    main_ip: IP,
    region: "ewr",
    plan: "vcg-a16-2c-8g-2vram",
    tags: cfg.instanceTagged === false ? [] : [TAG],
  });

  const fetchFn: FetchLike = async (url, init) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url });

    if (url.includes(":11434/api/tags")) {
      if (cfg.ollamaOk === false) return json({}, 503);
      const models = cfg.modelReady === false ? [] : [{ name: "llama3.2:1b" }];
      return json({ models });
    }
    const path = url.replace("https://api.vultr.com/v2", "");
    if (method === "POST" && path === "/instances") {
      return cfg.create402
        ? json({ error: "insufficient balance" }, 402)
        : json({ instance: instance() });
    }
    if (method === "GET" && path.startsWith("/instances?tag=")) {
      return json({ instances: cfg.managed ?? [] });
    }
    if (method === "GET" && path.startsWith("/instances/")) {
      if (deleted) return json({ error: "not found" }, 404);
      if (cfg.instanceGetFailFirst && !getFailedOnce) {
        getFailedOnce = true;
        return json({ error: "rate limited" }, 429);
      }
      return json({ instance: instance() });
    }
    if (method === "DELETE" && path.startsWith("/instances/")) {
      deleted = true;
      return new Response(null, { status: 204 });
    }
    if (method === "POST" && path === "/vpcs") {
      return json({ vpc: { id: VPC_ID, v4_subnet: "10.20.0.0", v4_subnet_mask: 24 } });
    }
    if (method === "POST" && /\/instances\/.+\/vpcs\/attach$/.test(path)) {
      return new Response(null, { status: 204 });
    }
    if (method === "DELETE" && path.startsWith("/vpcs/")) {
      return new Response(null, { status: 204 });
    }
    return json({ error: `unhandled ${method} ${path}` }, 500);
  };

  return { fetchFn, calls };
}

/** Deterministic clock that advances so poll loops terminate. */
function advancingClock(step = 1000): () => number {
  let t = 0;
  return () => {
    const v = t;
    t += step;
    return v;
  };
}

function newTenant(repo: TenantRepository, regionCode = "ewr") {
  return repo.create({
    name: "Harbor Free Clinic",
    regionCode,
    sliceSize: "a16-1_8",
    model: "DeepSeek V4 Flash",
  });
}

describe("VultrProvisioner", () => {
  let repo: TenantRepository;
  beforeEach(() => {
    repo = createInMemoryTenantRepository();
  });

  it("provisions a tenant end-to-end with real resource ids and a dedicated endpoint", async () => {
    const { fetchFn, calls } = fakeVultr();
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      allowOpenEndpoint: true,
    });
    const t = newTenant(repo);
    await prov.provisionAsync(t.id);

    const after = repo.get(t.id)!;
    expect(after.status).toBe("running");
    expect(after.completedSteps).toEqual(["slice", "vpc", "bucket", "endpoint", "live"]);
    // Real Vultr ids landed in the isolation badge.
    expect(after.isolation.gpuSlice.id).toBe(INSTANCE_ID);
    expect(after.isolation.gpuSlice.confirmed).toBe(true);
    expect(after.isolation.vpc.id).toBe(VPC_ID);
    expect(after.isolation.vpc.cidr).toBe("10.20.0.0/24");
    expect(after.isolation.bucket.confirmed).toBe(true);
    // Endpoint points at the instance's own Ollama, not the shared backend.
    expect(after.endpointUrl).toBe(`http://${IP}:11434/v1`);
    expect(after.billingStartedAt).toBe(1000);
    // The create was tagged for the teardown guard.
    const create = calls.find((c) => c.method === "POST" && c.url.endsWith("/instances"));
    expect(create).toBeTruthy();
  });

  it("refuses to provision an open endpoint without a firewall group (secure default)", async () => {
    const { fetchFn, calls } = fakeVultr();
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      // note: allowOpenEndpoint NOT set, and no firewallGroupId
    });
    const t = newTenant(repo);
    await prov.provisionAsync(t.id);

    const after = repo.get(t.id)!;
    expect(after.status).toBe("failed");
    expect(after.failure?.step).toBe("slice");
    expect(after.failure?.message).toMatch(/firewall|unauthenticated/i);
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("provisions when a firewall group is configured", async () => {
    const { fetchFn } = fakeVultr();
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      firewallGroupId: "fw-123",
    });
    const t = newTenant(repo);
    await prov.provisionAsync(t.id);
    expect(repo.get(t.id)!.status).toBe("running");
  });

  it("does not go live until the model is actually pulled (not just Ollama up)", async () => {
    // Ollama answers /api/tags but the model isn't in the list yet.
    const { fetchFn, calls } = fakeVultr({ modelReady: false });
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: advancingClock(1000),
      tag: TAG,
      allowOpenEndpoint: true,
      endpointTimeoutMs: 5000,
    });
    const t = newTenant(repo);
    await prov.provisionAsync(t.id);

    const after = repo.get(t.id)!;
    expect(after.status).toBe("failed");
    expect(after.failure?.step).toBe("endpoint");
    // The half-provisioned instance was cleaned up.
    expect(calls.some((c) => c.method === "DELETE" && c.url.includes("/instances/"))).toBe(true);
  });

  it("survives a transient API error while polling for the instance IP", async () => {
    const { fetchFn } = fakeVultr({ instanceGetFailFirst: true });
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      allowOpenEndpoint: true,
    });
    const t = newTenant(repo);
    await prov.provisionAsync(t.id);
    // A single 429 during IP polling must not abort/delete the instance.
    expect(repo.get(t.id)!.status).toBe("running");
  });

  it("fails cleanly (no create) when the region has no A16 slice", async () => {
    const { fetchFn, calls } = fakeVultr();
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      allowOpenEndpoint: true,
    });
    const t = newTenant(repo, "ams"); // Amsterdam has no A16 slice
    await prov.provisionAsync(t.id);

    const after = repo.get(t.id)!;
    expect(after.status).toBe("failed");
    expect(after.failure?.step).toBe("slice");
    expect(after.billingStartedAt).toBeNull();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("fails with a fund-the-account message on a billing rejection", async () => {
    const { fetchFn } = fakeVultr({ create402: true });
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      allowOpenEndpoint: true,
    });
    const t = newTenant(repo);
    await prov.provisionAsync(t.id);

    const after = repo.get(t.id)!;
    expect(after.status).toBe("failed");
    expect(after.failure?.step).toBe("slice");
    expect(after.failure?.message).toMatch(/balance|fund/i);
  });

  it("tears down the instance when the endpoint never comes healthy (no leaked GPU)", async () => {
    const { fetchFn, calls } = fakeVultr({ ollamaOk: false });
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: advancingClock(1000),
      tag: TAG,
      allowOpenEndpoint: true,
      endpointTimeoutMs: 5000,
    });
    const t = newTenant(repo);
    await prov.provisionAsync(t.id);

    const after = repo.get(t.id)!;
    expect(after.status).toBe("failed");
    expect(after.failure?.step).toBe("endpoint");
    // The created instance was deleted so it can't keep billing.
    expect(calls.some((c) => c.method === "DELETE" && c.url.includes(`/instances/`))).toBe(true);
  });

  it("REFUSES to tear down an instance that isn't tagged acre-managed", async () => {
    const { fetchFn, calls } = fakeVultr({ instanceTagged: false });
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      allowOpenEndpoint: true,
    });
    // A running tenant whose recorded instance id is real but (per the fake) untagged.
    const t = newTenant(repo);
    repo.save({
      ...repo.get(t.id)!,
      status: "running",
      isolation: {
        ...t.isolation,
        gpuSlice: { id: INSTANCE_ID, confirmed: true },
      },
    });

    await prov.teardownAsync(t.id);

    // Guard held: no delete issued, tenant not marked stopped.
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    expect(repo.get(t.id)!.status).not.toBe("stopped");
  });

  it("tears down a tagged instance and stops billing", async () => {
    const { fetchFn, calls } = fakeVultr();
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 4242,
      tag: TAG,
      allowOpenEndpoint: true,
    });
    const t = newTenant(repo);
    repo.save({
      ...repo.get(t.id)!,
      status: "running",
      billingStartedAt: 1000,
      isolation: {
        ...t.isolation,
        gpuSlice: { id: INSTANCE_ID, confirmed: true },
        vpc: { ...t.isolation.vpc, id: VPC_ID, confirmed: true },
      },
    });

    await prov.teardownAsync(t.id);

    const after = repo.get(t.id)!;
    expect(after.status).toBe("stopped");
    expect(after.endpointUrl).toBeNull();
    expect(after.billingStoppedAt).toBe(4242);
    expect(calls.some((c) => c.method === "DELETE" && c.url.includes("/instances/"))).toBe(true);
  });

  it("ignores a concurrent double-provision (one instance, not two)", async () => {
    const { fetchFn, calls } = fakeVultr();
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      allowOpenEndpoint: true,
    });
    const t = newTenant(repo);
    // Fire two provisions for the same tenant before the first settles.
    const p1 = prov.provisionAsync(t.id);
    const p2 = prov.provisionAsync(t.id);
    await Promise.all([p1, p2]);

    const creates = calls.filter(
      (c) => c.method === "POST" && c.url.endsWith("/instances"),
    );
    expect(creates.length).toBe(1);
    expect(repo.get(t.id)!.status).toBe("running");
  });

  it("reaps orphaned managed instances not in the keep set", async () => {
    const { fetchFn, calls } = fakeVultr({
      managed: [
        { id: INSTANCE_ID, tags: [TAG] },
        { id: "99999999-8888-7777-6666-555555555555", tags: [TAG] },
      ],
    });
    const prov = new VultrProvisioner(repo, "test-key", {
      fetchFn,
      sleep: async () => {},
      now: () => 1000,
      tag: TAG,
      allowOpenEndpoint: true,
    });

    const reaped = await prov.reapOrphans(new Set([INSTANCE_ID]));
    expect(reaped).toEqual(["99999999-8888-7777-6666-555555555555"]);
    expect(calls.filter((c) => c.method === "DELETE").length).toBe(1);
  });
});
