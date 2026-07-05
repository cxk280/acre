import { describe, expect, it } from "vitest";
import { POST as teardownAll } from "@/app/api/tenants/teardown-all/route";
import type { Tenant } from "@/lib/domain/types";
import { tenantRepository } from "@/lib/store/tenant-repository";

describe("POST /api/tenants/teardown-all", () => {
  it("tears down every billable tenant and reports the count", async () => {
    const a = tenantRepository.create({
      name: "Bulk A",
      regionCode: "ewr",
      sliceSize: "a16-1_8",
      model: "Llama-3-8B",
    });
    const b = tenantRepository.create({
      name: "Bulk B",
      regionCode: "ams",
      sliceSize: "a16-1_4",
      model: "Mistral-7B",
    });
    tenantRepository.save({ ...a, status: "running" } as Tenant);
    tenantRepository.save({ ...b, status: "running" } as Tenant);

    const res = await teardownAll();
    expect(res.status).toBe(200);
    const { tornDown } = (await res.json()) as { tornDown: number };
    expect(tornDown).toBeGreaterThanOrEqual(2);

    // Both are now tearing_down or stopped, not running.
    expect(tenantRepository.get(a.id)?.status).not.toBe("running");
    expect(tenantRepository.get(b.id)?.status).not.toBe("running");
  });
});
