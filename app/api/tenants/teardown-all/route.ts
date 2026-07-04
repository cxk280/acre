import { NextResponse } from "next/server";
import { provisioner } from "@/lib/provisioner";
import { tenantRepository } from "@/lib/store/tenant-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bulk teardown — resets the demo stage. Tears down every tenant that is still
// billable (not already stopped or tearing down); the fleet spend collapses.
export function POST() {
  const active = tenantRepository
    .list()
    .filter((t) => t.status !== "stopped" && t.status !== "tearing_down");
  for (const tenant of active) {
    provisioner.teardown(tenant.id);
  }
  return NextResponse.json({ tornDown: active.length });
}
