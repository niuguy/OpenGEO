import { describe, expect, it } from "vitest";
import { buildLangfuseTraceUrl, isLangfuseEnabled } from "./langfuse";

describe("langfuse observability config", () => {
  it("stays disabled when explicitly disabled", () => {
    expect(
      isLangfuseEnabled({
        LANGFUSE_ENABLED: "false",
        LANGFUSE_PUBLIC_KEY: "pk",
        LANGFUSE_SECRET_KEY: "sk"
      })
    ).toBe(false);
  });

  it("stays disabled when credentials are missing", () => {
    expect(isLangfuseEnabled({ LANGFUSE_ENABLED: "true" })).toBe(false);
  });

  it("builds an internal trace URL only when enabled", () => {
    expect(
      buildLangfuseTraceUrl("trace-1", {
        LANGFUSE_ENABLED: "true",
        LANGFUSE_PUBLIC_KEY: "pk",
        LANGFUSE_SECRET_KEY: "sk",
        LANGFUSE_BASE_URL: "https://langfuse.example.com/"
      })
    ).toBe("https://langfuse.example.com/trace/trace-1");
  });
});
