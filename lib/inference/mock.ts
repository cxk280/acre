// MockInference — the offline fallback. It does NOT run a model, so it can't
// answer questions; it returns a short, honest placeholder that names the model
// and points at the real adapters. Used when ACRE_INFERENCE is unset, or when the
// Ollama adapter can't reach a local model. The delay is injectable so tests run
// instantly while the app gets a realistic latency.

import type { InferenceResult } from "@/lib/domain/inference";
import type { Inference, InferenceInput } from "./types";

type DelayFn = (ms: number) => Promise<void>;

function clip(text: string, max = 80): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

/** Rough token estimate — ~1.4 tokens per whitespace-delimited word. */
function estimateTokens(text: string): number {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.ceil(words * 1.4);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class MockInference implements Inference {
  private readonly delay: DelayFn;

  constructor(opts: { delay?: DelayFn } = {}) {
    this.delay =
      opts.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async infer(input: InferenceInput): Promise<InferenceResult> {
    const prompt = input.prompt.trim();
    const reply = prompt
      ? `Demo endpoint — no model is loaded here yet, so I can't answer “${clip(prompt)}”. ` +
        `Connect a real model (Ollama locally, or Vultr Serverless Inference once deployed) ` +
        `to get a full answer on ${input.model}.`
      : `Demo endpoint on ${input.model}. Ask a question once a model is connected.`;

    const tokens = estimateTokens(prompt) + estimateTokens(reply);
    const latencyMs = clamp(280 + prompt.length * 3, 280, 1200);
    await this.delay(latencyMs);

    return { reply, tokens, latencyMs, model: input.model };
  }
}
