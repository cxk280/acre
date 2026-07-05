// OllamaInference — real answers from a local Ollama model (free, no key). Used
// when ACRE_INFERENCE=ollama. If Ollama isn't running or the model isn't pulled,
// it falls back to the mock so local dev never breaks.
//
//   Local setup:  pull a model, e.g.  `ollama pull llama3.2:3b`
//   Config:       ACRE_INFERENCE=ollama  (optional: OLLAMA_MODEL, OLLAMA_URL)

import type { InferenceResult } from "@/lib/domain/inference";
import { MockInference } from "./mock";
import type { Inference, InferenceInput } from "./types";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export const INFERENCE_SYSTEM_PROMPT =
  "You are a helpful assistant running on a small organization's own private, " +
  "dedicated inference endpoint. Answer the user's question directly and concisely.";

/** Map the tenant's chosen model to an Ollama model tag (OLLAMA_MODEL overrides). */
function ollamaModel(tenantModel: string): string {
  if (process.env.OLLAMA_MODEL) return process.env.OLLAMA_MODEL;
  const m = tenantModel.toLowerCase();
  if (m.includes("mistral")) return "mistral";
  if (m.includes("phi")) return "phi3";
  if (m.includes("qwen")) return "qwen2";
  return "llama3.2:3b";
}

export class OllamaInference implements Inference {
  private readonly fallback = new MockInference();

  async infer(input: InferenceInput): Promise<InferenceResult> {
    const started = Date.now();
    try {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Cap the wait so a slow/stuck model can't hang the Playground — on
        // timeout we fall back to the mock below.
        signal: AbortSignal.timeout(
          Number(process.env.OLLAMA_TIMEOUT_MS ?? 45000),
        ),
        body: JSON.stringify({
          model: ollamaModel(input.model),
          stream: false,
          // Keep the model resident so only the FIRST query pays the cold-load
          // cost — the rest of a demo session stays snappy.
          keep_alive: "30m",
          // Bound the answer length so replies come back in a few seconds.
          options: { num_predict: 300 },
          messages: [
            { role: "system", content: INFERENCE_SYSTEM_PROMPT },
            ...(input.history ?? []),
            { role: "user", content: input.prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
      const data = (await res.json()) as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };
      const reply = data.message?.content?.trim();
      if (!reply) throw new Error("Ollama returned no content");
      return {
        reply,
        tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        latencyMs: Date.now() - started,
        model: input.model,
      };
    } catch {
      // Ollama not running / model not pulled → don't break the demo.
      return this.fallback.infer(input);
    }
  }
}
