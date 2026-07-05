import { describe, expect, it } from "vitest";
import { GET as getTenant } from "@/app/api/tenants/[id]/route";
import { POST as teardown } from "@/app/api/tenants/[id]/teardown/route";
import { GET as listTenants, POST as createTenant } from "@/app/api/tenants/route";
import type { Tenant } from "@/lib/domain/types";

function postBody(body: unknown): Request {
  return new Request("http://localhost/api/tenants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "API Test Clinic",
  regionCode: "ewr",
  sliceSize: "a16-1_8",
  model: "deepseek-ai/DeepSeek-V4-Flash",
};

describe("tenants API route handlers", () => {
  it("POST creates a tenant in provisioning state and lists it", async () => {
    const res = await createTenant(postBody(validBody));
    expect(res.status).toBe(201);
    const { tenant } = (await res.json()) as { tenant: Tenant };
    expect(tenant.status).toBe("provisioning");
    expect(tenant.ratePerHour).toBeLessThan(0.5);

    const listRes = listTenants();
    const { tenants } = (await listRes.json()) as { tenants: Tenant[] };
    expect(tenants.some((t) => t.id === tenant.id)).toBe(true);
  });

  it("POST rejects invalid input with 400", async () => {
    const res = await createTenant(postBody({ ...validBody, regionCode: "mars" }));
    expect(res.status).toBe(400);
  });

  it("POST rejects malformed JSON with 400", async () => {
    const bad = new Request("http://localhost/api/tenants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await createTenant(bad);
    expect(res.status).toBe(400);
  });

  it("GET /[id] returns 404 for an unknown tenant", async () => {
    const res = await getTenant(new Request("http://localhost"), {
      params: Promise.resolve({ id: "tnt-does-not-exist" }),
    });
    expect(res.status).toBe(404);
  });

  it("GET /[id] returns an existing tenant, and teardown transitions it", async () => {
    const created = await createTenant(postBody(validBody));
    const { tenant } = (await created.json()) as { tenant: Tenant };

    const detail = await getTenant(new Request("http://localhost"), {
      params: Promise.resolve({ id: tenant.id }),
    });
    expect(detail.status).toBe(200);

    const tornRes = await teardown(new Request("http://localhost"), {
      params: Promise.resolve({ id: tenant.id }),
    });
    expect(tornRes.status).toBe(200);
    const { tenant: torn } = (await tornRes.json()) as { tenant: Tenant };
    expect(["tearing_down", "stopped"]).toContain(torn.status);
  });

  it("teardown returns 404 for an unknown tenant", async () => {
    const res = await teardown(new Request("http://localhost"), {
      params: Promise.resolve({ id: "tnt-nope" }),
    });
    expect(res.status).toBe(404);
  });
});
