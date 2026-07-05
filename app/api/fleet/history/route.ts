import { NextResponse } from "next/server";
import { COST_CEILING_PER_HOUR } from "@/lib/domain/rates";
import { ensureSampler, fleetHistory } from "@/lib/metrics/fleet-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  ensureSampler(); // start sampling on first request
  return NextResponse.json({
    samples: fleetHistory.snapshot(),
    ceiling: COST_CEILING_PER_HOUR,
  });
}
