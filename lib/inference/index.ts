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
      const model =
        process.env.VULTR_INFERENCE_MODEL ?? "llama2-13b-chat-Q5_K_M.gguf";
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

export type { Inference, InferenceInput } from "./types";
