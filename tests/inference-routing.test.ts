import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inference,
  inferenceForTenant,
  isDedicatedEndpoint,
} from "@/lib/inference";
import { OllamaInference } from "@/lib/inference/ollama";

function tenant(endpointUrl: string | null) {
  return { endpointUrl };
}

describe("isDedicatedEndpoint", () => {
  it("recognizes a real per-instance Ollama endpoint", () => {
    expect(isDedicatedEndpoint("http://192.0.2.10:11434/v1")).toBe(true);
  });
  it("rejects the mock's fake endpoint and null", () => {
    expect(isDedicatedEndpoint("https://tnt-4471.acre.io/v1")).toBe(false);
    expect(isDedicatedEndpoint(null)).toBe(false);
  });
});

describe("inferenceForTenant", () => {
  afterEach(() => {
    delete process.env.ACRE_PROVISIONER;
  });

  it("uses the shared backend when not on the Vultr provisioner", () => {
    delete process.env.ACRE_PROVISIONER;
    expect(inferenceForTenant(tenant("http://192.0.2.10:11434/v1"))).toBe(inference);
  });

  it("uses a dedicated Ollama client for a Vultr tenant with a real endpoint", () => {
    process.env.ACRE_PROVISIONER = "vultr";
    const picked = inferenceForTenant(tenant("http://192.0.2.10:11434/v1"));
    expect(picked).toBeInstanceOf(OllamaInference);
    expect(picked).not.toBe(inference);
  });

  it("stays on the shared backend for a Vultr tenant without a dedicated endpoint", () => {
    process.env.ACRE_PROVISIONER = "vultr";
    expect(inferenceForTenant(tenant("https://tnt-1.acre.io/v1"))).toBe(inference);
  });
});

describe("OllamaInference dedicated endpoint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the tenant's own endpoint with the pulled model tag", async () => {
    const seen: { url: string; body: unknown }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(
        JSON.stringify({ message: { content: "hello from your GPU" }, eval_count: 5 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const dedicated = new OllamaInference({ model: "llama3.2:1b", fallbackToMock: false });
    const result = await dedicated.infer({
      prompt: "hi",
      model: "DeepSeek V4 Flash",
      region: "New Jersey",
      endpointUrl: "http://192.0.2.10:11434/v1",
    });

    expect(result.reply).toBe("hello from your GPU");
    // Hit the instance's native Ollama API (the /v1 suffix stripped), with the tag
    // actually pulled onto the box — not the tenant's display model.
    expect(seen[0].url).toBe("http://192.0.2.10:11434/api/chat");
    expect((seen[0].body as { model: string }).model).toBe("llama3.2:1b");
  });

  it("surfaces errors loudly (no silent mock fallback) for a dedicated endpoint", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("connection refused");
    });
    const dedicated = new OllamaInference({ fallbackToMock: false });
    await expect(
      dedicated.infer({
        prompt: "hi",
        model: "x",
        region: "r",
        endpointUrl: "http://192.0.2.10:11434/v1",
      }),
    ).rejects.toThrow();
  });

  it("falls back to the mock on error when fallback is enabled (shared dev)", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("no ollama here");
    });
    const shared = new OllamaInference(); // fallbackToMock defaults true
    const result = await shared.infer({ prompt: "hi", model: "x", region: "r" });
    expect(result.reply).toMatch(/demo endpoint/i);
  });
});
