import { NextResponse } from "next/server";
import { regionByCode } from "@/lib/domain/catalog";
import { provisioner } from "@/lib/provisioner";
import { tenantRepository } from "@/lib/store/tenant-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Retry a failed tenant, optionally in a new region (e.g. after "region at
// capacity"). Re-runs provisioning from a clean state.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenant = tenantRepository.get(id);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  let regionCode: string | undefined;
  try {
    const body = (await request.json()) as { regionCode?: unknown };
    if (typeof body?.regionCode === "string") regionCode = body.regionCode;
  } catch {
    // no body — retry in the same region
  }
  if (regionCode && !regionByCode(regionCode)) {
    return NextResponse.json({ error: "Unknown region." }, { status: 400 });
  }

  provisioner.retry(id, regionCode);
  return NextResponse.json({ tenant: tenantRepository.get(id) });
}
