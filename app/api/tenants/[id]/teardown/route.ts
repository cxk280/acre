import { NextResponse } from "next/server";
import { provisioner } from "@/lib/provisioner";
import { tenantRepository } from "@/lib/store/tenant-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenant = tenantRepository.get(id);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }
  provisioner.teardown(id);
  return NextResponse.json({ tenant: tenantRepository.get(id) });
}
