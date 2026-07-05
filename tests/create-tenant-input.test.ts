import { describe, expect, it } from "vitest";
import { parseCreateTenantInput } from "@/lib/api/create-tenant-input";

const valid = {
  name: "Harbor Free Clinic",
  regionCode: "ewr",
  sliceSize: "a16-1_8",
  model: "deepseek-ai/DeepSeek-V4-Flash",
};

describe("parseCreateTenantInput", () => {
  it("accepts a valid body and trims the name", () => {
    const result = parseCreateTenantInput({ ...valid, name: "  Clinic  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Clinic");
  });

  it.each([
    ["non-object", 42],
    ["null", null],
    ["missing name", { ...valid, name: "" }],
    ["whitespace name", { ...valid, name: "   " }],
    ["overlong name", { ...valid, name: "x".repeat(61) }],
    ["unknown region", { ...valid, regionCode: "mars" }],
    ["unknown slice", { ...valid, sliceSize: "a100-full" }],
    ["unknown model", { ...valid, model: "GPT-9" }],
  ])("rejects %s", (_label, body) => {
    const result = parseCreateTenantInput(body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });
});
