// Fleet spend history — a bounded in-memory ring buffer of fleet $/hr samples,
// plus a process-wide sampler that records the live fleet rate on an interval.
// This turns the Admin spend chart into a real time series (so the elastic
// teardown dip actually shows), rather than a synthesized one.
//
// Demo caveat (same as the tenant store): process-local, single instance, resets
// on restart.

import { computeFleetSummary } from "@/lib/domain/fleet";
import { tenantRepository } from "@/lib/store/tenant-repository";

export interface FleetSample {
  /** epoch ms */
  t: number;
  /** fleet $/hr at that moment */
  rate: number;
}

/** ~5s samples, 60 deep → the last ~5 minutes of fleet spend. */
export const SAMPLE_INTERVAL_MS = 5000;
const DEFAULT_CAPACITY = 60;

export class FleetHistory {
  private samples: FleetSample[] = [];

  constructor(private readonly capacity: number = DEFAULT_CAPACITY) {}

  record(rate: number, t: number): void {
    this.samples.push({ t, rate });
    if (this.samples.length > this.capacity) {
      this.samples.splice(0, this.samples.length - this.capacity);
    }
  }

  snapshot(): FleetSample[] {
    return [...this.samples];
  }

  get size(): number {
    return this.samples.length;
  }
}

// Persist the history + sampler flag across dev HMR reloads.
const globalMetrics = globalThis as unknown as {
  __acreFleetHistory?: FleetHistory;
  __acreFleetSampler?: boolean;
};

export const fleetHistory: FleetHistory =
  globalMetrics.__acreFleetHistory ??
  (globalMetrics.__acreFleetHistory = new FleetHistory());

/** Idempotently start the sampler (called lazily from the history route). */
export function ensureSampler(): void {
  if (globalMetrics.__acreFleetSampler) return;
  globalMetrics.__acreFleetSampler = true;

  const tick = () => {
    const summary = computeFleetSummary(tenantRepository.list());
    fleetHistory.record(summary.fleetRatePerHour, Date.now());
  };
  tick();
  const timer = setInterval(tick, SAMPLE_INTERVAL_MS);
  // Don't keep the process alive just for sampling.
  if (typeof timer.unref === "function") timer.unref();
}
