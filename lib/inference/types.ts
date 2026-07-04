// The inference port. An Inference implementation answers a prompt on behalf of a
// tenant's dedicated endpoint. The mock simulates it; a real adapter (calling the
// tenant's private inference URL) is the swappable future implementation.

import type { ChatMessage, InferenceResult } from "@/lib/domain/inference";

export interface InferenceInput {
  prompt: string;
  model: string;
  region: string;
  history?: ChatMessage[];
}

export interface Inference {
  infer(input: InferenceInput): Promise<InferenceResult>;
}
