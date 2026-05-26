import { describe, expect, it } from "vitest";
import { extractionResultSchema } from "../extraction-schema";

describe("extractionResultSchema", () => {
  it("validates structured extraction payloads", () => {
    const result = extractionResultSchema.parse({
      mentionedBusinesses: [
        {
          name: "Example Dental Clinic",
          rank: 2,
          sentiment: "positive",
          reasons: ["Mentioned for emergency appointments"]
        }
      ],
      targetAppears: true,
      targetRank: 2,
      sentiment: "positive",
      semanticAttributes: [
        {
          label: "emergency dentist",
          evidence: "The answer mentions emergency appointments."
        }
      ],
      reasons: ["The target appears in the recommendation list."],
      sources: ["https://example.com"],
      referenceSignals: [
        {
          sourceType: "business_website",
          label: "Clinic website",
          url: "https://example.com",
          evidence: "The answer mentions the clinic website.",
          mentionedForBusinesses: ["Example Dental Clinic"]
        }
      ],
      confidence: 0.82
    });

    expect(result.targetAppears).toBe(true);
    expect(result.confidence).toBe(0.82);
  });

  it("rejects confidence outside the allowed range", () => {
    const parsed = extractionResultSchema.safeParse({
      mentionedBusinesses: [],
      targetAppears: false,
      targetRank: null,
      sentiment: "unknown",
      semanticAttributes: [],
      reasons: [],
      sources: [],
      referenceSignals: [],
      confidence: 1.2
    });

    expect(parsed.success).toBe(false);
  });
});
