// Fleet-level rollups for the Admin overview. Pure over a tenant list so the
// summary is testable and the view stays thin.

import { isBillingActive } from "./rates";
import type { Tenant } from "./types";

export interface FleetSummary {
  /** Tenants that still exist (not torn down). */
  activeTenants: number;
  runningTenants: number;
  idleTenants: number;
  /** Summed $/hr across billing tenants — the live fleet spend. */
  fleetRatePerHour: number;
  /** Distinct region labels in use. */
  regions: string[];
  /** One dedicated GPU slice per active tenant. */
  sliceCount: number;
}

export function computeFleetSummary(tenants: Tenant[]): FleetSummary {
  const active = tenants.filter((t) => t.status !== "stopped");
  return {
    activeTenants: active.length,
    runningTenants: tenants.filter((t) => t.status === "running").length,
    idleTenants: tenants.filter((t) => t.status === "idle").length,
    fleetRatePerHour: active
      .filter(isBillingActive)
      .reduce((sum, t) => sum + t.ratePerHour, 0),
    regions: [...new Set(active.map((t) => t.region))],
    sliceCount: active.length,
  };
}
