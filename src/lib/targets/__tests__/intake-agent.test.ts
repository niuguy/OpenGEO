import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inferTargetProfile, suggestionToTargetProfile, type IntakeSuggestion } from "@/lib/targets/intake-agent";

describe("inferTargetProfile (no API key)", () => {
  const savedKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedKey;
  });

  it("falls back to a local_business suggestion built from inferred crawl fields", async () => {
    const { suggestion, usedLlm } = await inferTargetProfile({
      name: "Bright Smile Dental",
      inferred: { category: "dentist", location: "Woking, Surrey", attributes: ["emergency dentist"] }
    });

    expect(usedLlm).toBe(false);
    expect(suggestion.kind).toBe("local_business");
    expect(suggestion.marketCategory).toBe("dentist");
    expect(suggestion.geography).toBe("Woking, Surrey");
    expect(suggestion.attributes).toEqual(["emergency dentist"]);
  });

  it("drops an unknown inferred location to null", async () => {
    const { suggestion } = await inferTargetProfile({
      name: "Mystery Co",
      inferred: { category: "", location: "Unknown location", attributes: [] }
    });
    expect(suggestion.geography).toBeNull();
  });
});

describe("suggestionToTargetProfile", () => {
  const suggestion: IntakeSuggestion = {
    name: "Acme",
    kind: "saas",
    marketCategory: "project management tool",
    geography: null,
    audience: "small teams",
    attributes: ["fast"],
    comparedEntities: ["Asana"],
    kindRationale: "online product",
    confidence: 0.8
  };

  it("maps null geography to undefined and carries through optional fields", () => {
    const profile = suggestionToTargetProfile(suggestion, "https://acme.com");
    expect(profile.geography).toBeUndefined();
    expect(profile.audience).toBe("small teams");
    expect(profile.websiteUrl).toBe("https://acme.com");
    expect(profile.kind).toBe("saas");
    expect(profile.comparedEntities).toEqual(["Asana"]);
  });

  it("omits an empty marketCategory and website", () => {
    const profile = suggestionToTargetProfile({ ...suggestion, marketCategory: "" }, "");
    expect(profile.marketCategory).toBeUndefined();
    expect(profile.websiteUrl).toBeUndefined();
  });
});
