import { NextResponse } from "next/server";
import { inference } from "@/lib/inference";
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

  const result = await inference.infer({
    prompt,
    model: tenant.model,
    region: tenant.region,
  });
  return NextResponse.json({ result });
}
