// Typed browser client for the tenants API. This is the contract the frontend
// consumes — every view talks to the server only through these functions.

import type { InferenceResult } from "@/lib/domain/inference";
import type { CreateTenantInput, Tenant } from "@/lib/domain/types";
import type { FleetSample } from "@/lib/metrics/fleet-history";

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function listTenants(signal?: AbortSignal): Promise<Tenant[]> {
  const res = await fetch("/api/tenants", { signal, cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { tenants: Tenant[] };
  return body.tenants;
}

export async function getTenant(
  id: string,
  signal?: AbortSignal,
): Promise<Tenant> {
  const res = await fetch(`/api/tenants/${id}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { tenant: Tenant };
  return body.tenant;
}

export async function createTenant(
  input: CreateTenantInput,
): Promise<Tenant> {
  const res = await fetch("/api/tenants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { tenant: Tenant };
  return body.tenant;
}

export async function teardownTenant(id: string): Promise<Tenant> {
  const res = await fetch(`/api/tenants/${id}/teardown`, { method: "POST" });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { tenant: Tenant };
  return body.tenant;
}

export async function retryTenant(
  id: string,
  regionCode?: string,
): Promise<Tenant> {
  const res = await fetch(`/api/tenants/${id}/retry`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ regionCode }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { tenant: Tenant };
  return body.tenant;
}

export interface FleetHistorySnapshot {
  samples: FleetSample[];
  ceiling: number;
}

export async function getFleetHistory(
  signal?: AbortSignal,
): Promise<FleetHistorySnapshot> {
  const res = await fetch("/api/fleet/history", { signal, cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as FleetHistorySnapshot;
}

export async function teardownAllTenants(): Promise<number> {
  const res = await fetch("/api/tenants/teardown-all", { method: "POST" });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { tornDown: number };
  return body.tornDown;
}

export async function runInference(
  id: string,
  prompt: string,
): Promise<InferenceResult> {
  const res = await fetch(`/api/tenants/${id}/infer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { result: InferenceResult };
  return body.result;
}
