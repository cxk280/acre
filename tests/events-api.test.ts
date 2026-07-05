import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/tenants/[id]/events/route";
import type { Tenant } from "@/lib/domain/types";
import { tenantRepository } from "@/lib/store/tenant-repository";

describe("GET /api/tenants/[id]/events (SSE)", () => {
  it("streams an initial tenant snapshot as an SSE data frame", async () => {
    const t = tenantRepository.create({
      name: "SSE Test",
      regionCode: "ewr",
      sliceSize: "a16-1_8",
      model: "Llama-3-8B",
    });
    const res = await GET(new Request("http://localhost/events"), {
      params: Promise.resolve({ id: t.id }),
    });
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const frame = new TextDecoder().decode(value);
    expect(frame.startsWith("data: ")).toBe(true);
    const parsed = JSON.parse(frame.replace(/^data: /, "").trim()) as Tenant;
    expect(parsed.id).toBe(t.id);

    await reader.cancel(); // triggers stream cancel → clears the interval
  });
});
