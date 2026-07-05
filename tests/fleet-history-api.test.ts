import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/fleet/history/route";
import { COST_CEILING_PER_HOUR } from "@/lib/domain/rates";
import type { FleetSample } from "@/lib/metrics/fleet-history";

describe("GET /api/fleet/history", () => {
  it("returns samples and the cost ceiling", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      samples: FleetSample[];
      ceiling: number;
    };
    expect(Array.isArray(body.samples)).toBe(true);
    expect(body.ceiling).toBe(COST_CEILING_PER_HOUR);
    // the lazy sampler records at least the initial sample on first request
    expect(body.samples.length).toBeGreaterThanOrEqual(1);
  });
});
