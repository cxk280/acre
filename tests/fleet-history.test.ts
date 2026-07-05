import { describe, expect, it } from "vitest";
import { FleetHistory } from "@/lib/metrics/fleet-history";

describe("FleetHistory ring buffer", () => {
  it("records samples in order and returns a copy", () => {
    const h = new FleetHistory(5);
    h.record(0.03, 100);
    h.record(0.06, 200);
    const snap = h.snapshot();
    expect(snap).toEqual([
      { t: 100, rate: 0.03 },
      { t: 200, rate: 0.06 },
    ]);
    // snapshot is a copy — mutating it doesn't affect the buffer
    snap.push({ t: 999, rate: 9 });
    expect(h.size).toBe(2);
  });

  it("caps at capacity, dropping the oldest samples", () => {
    const h = new FleetHistory(3);
    for (let i = 0; i < 6; i++) h.record(i / 100, i);
    const snap = h.snapshot();
    expect(snap).toHaveLength(3);
    // keeps the last three: t = 3,4,5
    expect(snap.map((s) => s.t)).toEqual([3, 4, 5]);
  });
});
