// VultrInference — real answers from Vultr Serverless Inference (OpenAI-compatible:
// POST https://api.vultrinference.com/v1/chat/completions, Bearer auth). Used when
// ACRE_INFERENCE=vultr. This is the on-brand backend for the deployed demo.
//
//   Config:  ACRE_INFERENCE=vultr
//            VULTR_INFERENCE_API_KEY=<your Vultr Inference key>
//            VULTR_INFERENCE_MODEL=<a model available on your account>
//
// The model list changes over time — check GET /v1/models or the Vultr portal and
// set VULTR_INFERENCE_MODEL accordingly.

import type { InferenceResult } from "@/lib/domain/inference";
import { INFERENCE_SYSTEM_PROMPT } from "./ollama";
import type { Inference, InferenceInput } from "./types";

const BASE_URL =
  process.env.VULTR_INFERENCE_URL ?? "https://api.vultrinference.com/v1";

export class VultrInference implements Inference {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async infer(input: InferenceInput): Promise<InferenceResult> {
    const started = Date.now();
    // Route to the tenant's chosen model; fall back to the env default.
    const model = input.model || this.model;
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(
        Number(process.env.VULTR_INFERENCE_TIMEOUT_MS ?? 30000),
      ),
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [
          { role: "system", content: INFERENCE_SYSTEM_PROMPT },
          ...(input.history ?? []),
          { role: "user", content: input.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Vultr inference failed (${res.status}). ${detail.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning?: string } }[];
      usage?: { total_tokens?: number };
    };
    const message = data.choices?.[0]?.message;
    // Prefer the answer; if a reasoning model returned only its thinking, show that.
    const reply = (message?.content || message?.reasoning || "").trim();
    return {
      reply,
      tokens: data.usage?.total_tokens ?? 0,
      latencyMs: Date.now() - started,
      model: input.model,
    };
  }
}
