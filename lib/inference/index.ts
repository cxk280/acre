// Composition root for inference. Pick the adapter from ACRE_INFERENCE and expose
// a single process-wide instance:
//   (unset)  → MockInference   (offline placeholder, the default)
//   ollama   → OllamaInference (free local model; falls back to mock)
//   vultr    → VultrInference  (Vultr Serverless Inference; needs a key)

import { MockInference } from "./mock";
import { OllamaInference } from "./ollama";
import type { Inference } from "./types";
import { VultrInference } from "./vultr";

function buildInference(): Inference {
  switch (process.env.ACRE_INFERENCE) {
    case "ollama":
      return new OllamaInference();
    case "vultr": {
      const apiKey = process.env.VULTR_INFERENCE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "ACRE_INFERENCE=vultr requires VULTR_INFERENCE_API_KEY to be set.",
        );
      }
      // Fallback only — set VULTR_INFERENCE_MODEL to a model on your account
      // (list them via GET /v1/models); Vultr's catalog changes over time.
      const model =
        process.env.VULTR_INFERENCE_MODEL ?? "deepseek-ai/DeepSeek-V4-Flash";
      return new VultrInference(apiKey, model);
    }
    default:
      return new MockInference();
  }
}

const globalInference = globalThis as unknown as {
  __acreInference?: Inference;
};

export const inference: Inference =
  globalInference.__acreInference ??
  (globalInference.__acreInference = buildInference());

/**
 * A tenant provisioned by VultrProvisioner has its OWN endpoint (Ollama on its
 * instance, http://<ip>:11434/v1) — genuinely dedicated, not the shared backend.
 * The mock provisioner's endpoint (https://<id>.acre.io/v1) is not real, so it
 * falls through to the shared `inference`.
 */
export function isDedicatedEndpoint(url: string | null): boolean {
  return !!url && url.startsWith("http://") && url.includes(":11434");
}

/**
 * Pick the inference backend for a tenant: its own dedicated instance when it has
 * a real endpoint, otherwise the shared process-wide backend. The dedicated path
 * forces the model that was actually pulled onto the instance and does NOT fall
 * back to the mock, so a broken private endpoint surfaces loudly.
 */
export function inferenceForTenant(tenant: {
  endpointUrl: string | null;
}): Inference {
  if (
    process.env.ACRE_PROVISIONER === "vultr" &&
    isDedicatedEndpoint(tenant.endpointUrl)
  ) {
    const model = process.env.ACRE_VULTR_OLLAMA_MODEL ?? "llama3.2:1b";
    return new OllamaInference({ model, fallbackToMock: false });
  }
  return inference;
}

export type { Inference, InferenceInput } from "./types";
