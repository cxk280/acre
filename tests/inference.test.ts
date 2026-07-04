import { describe, expect, it } from "vitest";
import { MockInference } from "@/lib/inference/mock";

const immediate = () => Promise.resolve();

describe("MockInference", () => {
  const engine = new MockInference({ delay: immediate });
  const input = {
    prompt: "Summarize the intake note for patient #4471 in two sentences.",
    model: "Llama-3-8B",
    region: "US-East · Ashburn",
  };

  it("returns a private-endpoint reply that names the model", async () => {
    const result = await engine.infer(input);
    expect(result.model).toBe("Llama-3-8B");
    expect(result.reply).toContain("Llama-3-8B");
    expect(result.reply.length).toBeGreaterThan(20);
  });

  it("reports a positive token count and a bounded latency", async () => {
    const result = await engine.infer(input);
    expect(result.tokens).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(280);
    expect(result.latencyMs).toBeLessThanOrEqual(1200);
  });

  it("is deterministic for the same prompt", async () => {
    const a = await engine.infer(input);
    const b = await engine.infer(input);
    expect(a).toEqual(b);
  });

  it("handles an empty prompt without throwing", async () => {
    const result = await engine.infer({ ...input, prompt: "" });
    expect(result.tokens).toBeGreaterThan(0); // reply still has tokens
    expect(result.latencyMs).toBe(280);
  });
});
