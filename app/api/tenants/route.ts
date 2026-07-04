import { NextResponse } from "next/server";
import { parseCreateTenantInput } from "@/lib/api/create-tenant-input";
import { provisioner } from "@/lib/provisioner";
import { tenantRepository } from "@/lib/store/tenant-repository";

// Node runtime + no caching: the store and provisioning timers are process-local
// and every read must reflect live provisioning state.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ tenants: tenantRepository.list() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = parseCreateTenantInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const tenant = tenantRepository.create(parsed.value);
  provisioner.provision(tenant.id);
  return NextResponse.json({ tenant }, { status: 201 });
}
