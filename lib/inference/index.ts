// Composition root for inference. Mirrors lib/provisioner/index.ts: pick the
// adapter and expose a single process-wide instance. Only the mock exists today;
// a real adapter that calls the tenant's private endpoint lands later.

import { MockInference } from "./mock";
import type { Inference } from "./types";

function buildInference(): Inference {
  return new MockInference();
}

const globalInference = globalThis as unknown as {
  __acreInference?: Inference;
};

export const inference: Inference =
  globalInference.__acreInference ??
  (globalInference.__acreInference = buildInference());

export type { Inference, InferenceInput } from "./types";
