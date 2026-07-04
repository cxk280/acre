import { NextResponse } from "next/server";
import { tenantRepository } from "@/lib/store/tenant-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenant = tenantRepository.get(id);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }
  return NextResponse.json({ tenant });
}
