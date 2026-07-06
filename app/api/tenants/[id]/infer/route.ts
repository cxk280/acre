import { NextResponse } from "next/server";
import { inferenceForTenant } from "@/lib/inference";
import { tenantRepository } from "@/lib/store/tenant-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenant = tenantRepository.get(id);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }
  if (tenant.status !== "running") {
    return NextResponse.json(
      { error: "This endpoint isn’t running yet." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const prompt =
    typeof (body as { prompt?: unknown })?.prompt === "string"
      ? ((body as { prompt: string }).prompt.trim())
      : "";
  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }

  // Route to the tenant's OWN dedicated endpoint when it has one; otherwise the
  // shared backend. A dedicated endpoint failure surfaces as a 502 rather than
  // silently returning canned text.
  try {
    const result = await inferenceForTenant(tenant).infer({
      prompt,
      model: tenant.model,
      region: tenant.region,
      endpointUrl: tenant.endpointUrl ?? undefined,
    });
    return NextResponse.json({ result });
  } catch (err) {
    // Log the detail (which can include the instance's internal IP) server-side;
    // return a generic message so infra details don't leak to the client.
    console.error(`[acre] inference failed for ${tenant.id}:`, err);
    return NextResponse.json(
      { error: "The tenant's dedicated endpoint did not respond." },
      { status: 502 },
    );
  }
}
