import { describe, expect, it } from "vitest";
import { POST as retry } from "@/app/api/tenants/[id]/retry/route";
import { failProvisioning } from "@/lib/domain/provisioning";
import type { Tenant } from "@/lib/domain/types";
import { tenantRepository } from "@/lib/store/tenant-repository";

function req(body: unknown): Request {
  return new Request("http://localhost/retry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function failedTenant(): Tenant {
  const t = tenantRepository.create({
    name: "Retry Test",
    regionCode: "blr", // at capacity
    sliceSize: "a16-1_8",
    model: "Llama-3-8B",
  });
  const failed = failProvisioning(t, "slice", "No free A16 slices right now.");
  tenantRepository.save(failed);
  return failed;
}

describe("POST /api/tenants/[id]/retry", () => {
  it("retries a failed tenant into a new region", async () => {
    const t = failedTenant();
    const res = await retry(req({ regionCode: "ewr" }), {
      params: Promise.resolve({ id: t.id }),
    });
    expect(res.status).toBe(200);
    const { tenant } = (await res.json()) as { tenant: Tenant };
    expect(tenant.regionCode).toBe("ewr");
    expect(tenant.failure).toBeNull();
    expect(["provisioning", "running"]).toContain(tenant.status);
  });

  it("404s for an unknown tenant", async () => {
    const res = await retry(req({}), {
      params: Promise.resolve({ id: "tnt-nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("400s for an unknown region", async () => {
    const t = failedTenant();
    const res = await retry(req({ regionCode: "mars" }), {
      params: Promise.resolve({ id: t.id }),
    });
    expect(res.status).toBe(400);
  });
});
