// Chat + inference domain types. The Playground sends a prompt to a tenant's own
// private endpoint and shows the reply — proof the dedicated endpoint is real.

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface InferenceResult {
  reply: string;
  /** Total tokens (prompt + completion) — shown in the readout. */
  tokens: number;
  latencyMs: number;
  model: string;
}
