// MockInference — a deterministic, offline stand-in for a real per-tenant model
// call. It returns a canned reply that emphasizes the private/isolated story,
// with a plausible token count and latency. The delay is injectable so tests run
// instantly while the app gets a realistic "streamed from your endpoint" feel.

import type { InferenceResult } from "@/lib/domain/inference";
import type { Inference, InferenceInput } from "./types";

type DelayFn = (ms: number) => Promise<void>;

const REPLY_TEMPLATES: Array<(clip: string, model: string, region: string) => string> = [
  (clip, model, region) =>
    `Running entirely on your dedicated ${model} slice — this request never left your private VPC in ${region}. On “${clip}”: I’ve handled it locally and can expand on any part you need.`,
  (clip, model) =>
    `Here’s a private, on-tenant answer from ${model}: I processed “${clip}” without touching any shared API. Want me to go deeper, or reformat the result?`,
  (clip, model) =>
    `Done — inference stayed inside your isolated endpoint. I’ve captured the key points of “${clip}” and sent nothing to a multi-tenant service. Ask a follow-up and I’ll keep it on ${model}.`,
];

function clip(text: string, max = 64): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function stableHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
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
    const template =
      REPLY_TEMPLATES[stableHash(input.prompt) % REPLY_TEMPLATES.length];
    const reply = template(clip(input.prompt), input.model, input.region);
    const tokens = estimateTokens(input.prompt) + estimateTokens(reply);
    const latencyMs = clamp(280 + input.prompt.length * 3, 280, 1200);

    await this.delay(latencyMs);

    return { reply, tokens, latencyMs, model: input.model };
  }
}
