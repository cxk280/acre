import { describe, expect, it } from "vitest";
import { POST as infer } from "@/app/api/tenants/[id]/infer/route";
import { endpointUrlFor } from "@/lib/domain/provisioning";
import type { InferenceResult } from "@/lib/domain/inference";
import type { Tenant } from "@/lib/domain/types";
import { tenantRepository } from "@/lib/store/tenant-repository";

function inferRequest(prompt: unknown): Request {
  return new Request("http://localhost/infer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
}

function makeRunningTenant(): Tenant {
  const t = tenantRepository.create({
    name: "Infer Test",
    regionCode: "ewr",
    sliceSize: "a16-1_8",
    model: "Llama-3-8B",
  });
  const running: Tenant = {
    ...t,
    status: "running",
    endpointUrl: endpointUrlFor(t.id),
  };
  tenantRepository.save(running);
  return running;
}

describe("POST /api/tenants/[id]/infer", () => {
  it("returns a reply for a running tenant", async () => {
    const tenant = makeRunningTenant();
    const res = await infer(inferRequest("Summarize this note."), {
      params: Promise.resolve({ id: tenant.id }),
    });
    expect(res.status).toBe(200);
    const { result } = (await res.json()) as { result: InferenceResult };
    expect(result.reply).toContain("Llama-3-8B");
    expect(result.tokens).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it("409s when the endpoint isn't running", async () => {
    const provisioning = tenantRepository.create({
      name: "Not Running",
      regionCode: "ewr",
      sliceSize: "a16-1_8",
      model: "Llama-3-8B",
    });
    const res = await infer(inferRequest("hi"), {
      params: Promise.resolve({ id: provisioning.id }),
    });
    expect(res.status).toBe(409);
  });

  it("404s for an unknown tenant", async () => {
    const res = await infer(inferRequest("hi"), {
      params: Promise.resolve({ id: "tnt-nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("400s on an empty prompt", async () => {
    const tenant = makeRunningTenant();
    const res = await infer(inferRequest("   "), {
      params: Promise.resolve({ id: tenant.id }),
    });
    expect(res.status).toBe(400);
  });
});
