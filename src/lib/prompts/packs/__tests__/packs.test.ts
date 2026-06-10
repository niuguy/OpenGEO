import { describe, expect, it } from "vitest";
import { generatePromptsForBusiness } from "@/lib/prompts";
import { localBusinessPack } from "@/lib/prompts/packs/local-business";
import { brandReputationPack } from "@/lib/prompts/packs/brand-reputation";
import { defaultPackForTargetKind, getPacksForTargetKind, getPromptPack, promptPacks } from "@/lib/prompts/packs/registry";
import { businessToTargetProfile, targetProfileToPromptPackInput } from "@/lib/targets/target-profile";

describe("local-business pack", () => {
  const business = {
    name: "Example Dental Clinic",
    category: "dentist",
    location: "Woking, Surrey",
    competitors: ["Bupa Dental Care Woking", "Portmore Dental"],
    attributes: ["emergency dentist", "root canal"]
  };

  it("produces identical prompts through the TargetProfile adapter and the legacy entry point", () => {
    const legacy = generatePromptsForBusiness(business);

    const profile = businessToTargetProfile(
      {
        name: business.name,
        category: business.category,
        location: business.location,
        targetAttributes: business.attributes
      },
      business.competitors
    );
    const viaPack = localBusinessPack.generate(targetProfileToPromptPackInput(profile));

    expect(viaPack).toEqual(legacy);
    expect(viaPack.length).toBeGreaterThan(0);
  });

  it("tags every prompt with the local-business pack id", () => {
    const prompts = generatePromptsForBusiness(business);
    expect(prompts.every((prompt) => prompt.packId === "local-business")).toBe(true);
  });
});

describe("brand-reputation pack", () => {
  const input = {
    targetName: "Example Helpdesk",
    targetKind: "saas",
    marketCategory: "customer support software",
    audience: "B2B SaaS teams",
    attributes: ["AI automation", "enterprise support"],
    comparedEntities: ["Intercom", "Zendesk", "Freshdesk"]
  };

  it("generates reputation prompts without any local fields", () => {
    const prompts = brandReputationPack.generate(input);

    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.some((prompt) => prompt.text === "what is Example Helpdesk?")).toBe(true);
    expect(prompts.some((prompt) => prompt.text === "is Example Helpdesk trustworthy?")).toBe(true);
    expect(prompts.some((prompt) => prompt.text === "what is the best customer support software for B2B SaaS teams?")).toBe(true);
    expect(prompts.some((prompt) => prompt.text === "Example Helpdesk vs Intercom: which is better?")).toBe(true);
    // No prompt should require a geography to make sense.
    expect(prompts.every((prompt) => !prompt.text.includes("undefined"))).toBe(true);
  });

  it("is deterministic and tags prompts with pack id and basis vocabulary", () => {
    const first = brandReputationPack.generate(input);
    const second = brandReputationPack.generate(input);

    expect(second).toEqual(first);
    expect(first.every((prompt) => prompt.packId === "brand-reputation")).toBe(true);
    expect(first.every((prompt) => prompt.samplingBasis.intent)).toBe(true);
    expect(first.every((prompt) => prompt.samplingBasis.wordingStyle)).toBe(true);
    expect(first.every((prompt) => prompt.samplingBasis.aspect)).toBe(true);
  });

  it("omits category and audience prompts when those fields are absent", () => {
    const prompts = brandReputationPack.generate({
      targetName: "Some Person",
      targetKind: "person",
      attributes: [],
      comparedEntities: []
    });

    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.every((prompt) => !prompt.text.includes("  "))).toBe(true);
    expect(prompts.some((prompt) => prompt.clusterId === "category-discovery")).toBe(false);
    expect(prompts.some((prompt) => prompt.clusterId === "audience-fit")).toBe(false);
  });

  it("deduplicates prompts", () => {
    const prompts = brandReputationPack.generate({
      ...input,
      attributes: ["AI automation", "AI automation"]
    });

    expect(new Set(prompts.map((prompt) => prompt.text)).size).toBe(prompts.length);
  });
});

describe("prompt pack registry", () => {
  it("exposes both initial packs", () => {
    expect(promptPacks.map((pack) => pack.id)).toEqual(["local-business", "brand-reputation"]);
    expect(getPromptPack("local-business")).toBe(localBusinessPack);
    expect(getPromptPack("brand-reputation")).toBe(brandReputationPack);
    expect(getPromptPack("nope")).toBeUndefined();
  });

  it("selects packs by target kind", () => {
    expect(getPacksForTargetKind("local_business")).toContain(localBusinessPack);
    expect(getPacksForTargetKind("saas")).toEqual([brandReputationPack]);
    expect(defaultPackForTargetKind("local_business")).toBe(localBusinessPack);
    expect(defaultPackForTargetKind("saas")).toBe(brandReputationPack);
    expect(defaultPackForTargetKind("unknown-kind")).toBe(brandReputationPack);
  });
});
