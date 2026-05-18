import { describe, expect, it } from "vitest";
import { generatePromptsForBusiness } from "../prompts";

describe("generatePromptsForBusiness", () => {
  it("generates local-intent prompts from business context", () => {
    const prompts = generatePromptsForBusiness({
      name: "Example Dental Clinic",
      category: "dentist",
      location: "Woking, Surrey",
      competitors: ["Bupa Dental Care Woking", "Portmore Dental"],
      attributes: ["emergency dentist", "root canal"]
    });

    expect(prompts.some((prompt) => prompt.text.startsWith("best dentist in Woking, Surrey"))).toBe(true);
    expect(prompts.some((prompt) => prompt.text.startsWith("best dentist near Woking, Surrey for emergency dentist"))).toBe(
      true
    );
    expect(
      prompts.some((prompt) =>
        prompt.text.startsWith("compare Example Dental Clinic with Bupa Dental Care Woking, Portmore Dental in Woking, Surrey")
      )
    ).toBe(true);
    expect(prompts.every((prompt) => prompt.text.includes("evidence or reference signals"))).toBe(true);
    expect(prompts.every((prompt) => prompt.samplingBasis.intent)).toBe(true);
    expect(prompts.every((prompt) => prompt.samplingBasis.wordingStyle)).toBe(true);
  });

  it("deduplicates prompts", () => {
    const prompts = generatePromptsForBusiness({
      name: "Example Dental Clinic",
      category: "dentist",
      location: "Woking, Surrey",
      competitors: [],
      attributes: ["emergency dentist", "emergency dentist"]
    });

    expect(new Set(prompts.map((prompt) => prompt.text)).size).toBe(prompts.length);
  });
});
