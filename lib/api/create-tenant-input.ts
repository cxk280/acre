// Parse + validate an untrusted request body into a CreateTenantInput. Kept as a
// pure function so it can be unit-tested and reused; the route handler stays thin.

import { MODELS, regionByCode, SLICE_OPTIONS } from "@/lib/domain/catalog";
import type { CreateTenantInput, SliceSize } from "@/lib/domain/types";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 60;

export function parseCreateTenantInput(
  body: unknown,
): ParseResult<CreateTenantInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { ok: false, error: "A tenant name is required." };
  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Tenant name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }

  const regionCode = typeof b.regionCode === "string" ? b.regionCode : "";
  if (!regionByCode(regionCode)) {
    return { ok: false, error: `Unknown region: ${regionCode || "(empty)"}.` };
  }

  const sliceSize = b.sliceSize;
  if (!SLICE_OPTIONS.some((s) => s.size === sliceSize)) {
    return { ok: false, error: `Unknown GPU slice size.` };
  }

  const model = typeof b.model === "string" ? b.model : "";
  if (!MODELS.some((m) => m.id === model)) {
    return { ok: false, error: `Unknown model: ${model || "(empty)"}.` };
  }

  return {
    ok: true,
    value: { name, regionCode, sliceSize: sliceSize as SliceSize, model },
  };
}
