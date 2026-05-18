import { describe, expect, it } from "vitest";
import { OBSERVATION_PROVIDERS, parseObservationProviders, providerLabel } from "./providers";

describe("observation providers", () => {
  it("includes provider labels used in audit reports", () => {
    expect(OBSERVATION_PROVIDERS).toEqual(["chatgpt", "gemini", "google_ai_overview"]);
    expect(providerLabel("google_ai_overview")).toBe("Google AI Overview");
  });

  it("parses configured providers and drops unknown values", () => {
    expect(parseObservationProviders("chatgpt,google_ai_overview,bogus")).toEqual(["chatgpt", "google_ai_overview"]);
  });
});
