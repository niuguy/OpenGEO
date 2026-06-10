import type { GeneratedPrompt, PromptPack, PromptPackInput, SamplingBasis } from "@/lib/prompts/types";
import { slugify, uniquePrompts } from "@/lib/prompts/types";

export const LOCAL_BUSINESS_PACK_ID = "local-business";

function buildPrompt(
  text: string,
  template: string,
  clusterId: string,
  clusterIntent: string,
  samplingBasis: SamplingBasis
): GeneratedPrompt {
  // PR-A: prompts are now clean consumer queries. Earlier versions appended a
  // vertical-aware "explain why you recommend them, cite reference signals
  // like NHS / ICAEW / ..." suffix to ground the LLM. That suffix biased every
  // answer toward heavy citation and degraded the moat claim ("real consumer
  // behaviour"). The deterministic name match downstream is what we use now
  // for the targetAppears decision; the LLM only contributes soft fields.
  return {
    text,
    template,
    clusterId,
    clusterIntent,
    packId: LOCAL_BUSINESS_PACK_ID,
    samplingBasis
  };
}

function generate(input: PromptPackInput): GeneratedPrompt[] {
  const category = (input.marketCategory ?? "").trim();
  const location = (input.geography ?? "").trim();
  const business = input.targetName.trim();
  const competitors = input.comparedEntities.map((name) => name.trim()).filter(Boolean);
  const attributes = input.attributes.map((attribute) => attribute.trim()).filter(Boolean);

  const prompt = buildPrompt;

  const prompts: GeneratedPrompt[] = [
    prompt(
      `best ${category} in ${location}`,
      "best {category} in {location}",
      "best-local-category",
      "Best local provider recommendation",
      {
        intent: "best-provider",
        locationStyle: "explicit-location",
        specificity: "broad-category",
        persona: "general-consumer",
        wordingStyle: "search-like",
        decisionMode: "best"
      }
    ),
    prompt(
      `which ${category} should I choose in ${location}?`,
      "which {category} should I choose in {location}?",
      "choice-local-category",
      "Selection advice among local providers",
      {
        intent: "provider-choice",
        locationStyle: "explicit-location",
        specificity: "broad-category",
        persona: "general-consumer",
        wordingStyle: "conversational",
        decisionMode: "choose"
      }
    ),
    prompt(
      `recommend a ${category} near ${location}`,
      "recommend a {category} near {location}",
      "recommend-local-category",
      "Direct recommendation request",
      {
        intent: "recommendation",
        locationStyle: "near-location",
        specificity: "broad-category",
        persona: "general-consumer",
        wordingStyle: "imperative",
        decisionMode: "recommend"
      }
    ),
    prompt(
      `what are the top rated ${category}s in ${location}?`,
      "what are the top rated {category}s in {location}?",
      "top-rated-local-category",
      "Top-rated local provider discovery",
      {
        intent: "reviews",
        locationStyle: "explicit-location",
        specificity: "broad-category",
        persona: "review-led-consumer",
        wordingStyle: "conversational",
        decisionMode: "top-rated"
      }
    ),
    prompt(
      `I need a reliable ${category} near me in ${location}`,
      "I need a reliable {category} near me in {location}",
      "near-me-reliable-provider",
      "Near-me reliability recommendation",
      {
        intent: "recommendation",
        locationStyle: "near-me-plus-location",
        specificity: "broad-category",
        persona: "local-consumer",
        wordingStyle: "conversational",
        decisionMode: "recommend"
      }
    ),
    prompt(
      `affordable ${category} recommendations in ${location}`,
      "affordable {category} recommendations in {location}",
      "affordable-local-category",
      "Price-sensitive provider discovery",
      {
        intent: "price",
        locationStyle: "explicit-location",
        specificity: "price-sensitive",
        persona: "price-sensitive-consumer",
        wordingStyle: "search-like",
        decisionMode: "recommend"
      }
    ),
    prompt(
      `which ${category} in ${location} is good for families?`,
      "which {category} in {location} is good for families?",
      "family-friendly-provider",
      "Family-friendly provider recommendation",
      {
        intent: "family-friendly",
        locationStyle: "explicit-location",
        specificity: "persona-specific",
        persona: "parent-or-family",
        wordingStyle: "conversational",
        decisionMode: "choose"
      }
    ),
    prompt(
      `where can I get a same-day ${category} appointment in ${location}?`,
      "where can I get a same-day {category} appointment in {location}?",
      "same-day-availability",
      "Urgent availability recommendation",
      {
        intent: "availability",
        locationStyle: "explicit-location",
        specificity: "same-day",
        persona: "urgent-need",
        wordingStyle: "conversational",
        decisionMode: "find"
      }
    ),
    prompt(
      `compare ${business} with competitors in ${location}`,
      "compare {business} with competitors in {location}",
      "target-vs-market",
      "Target business comparison against local market",
      {
        intent: "comparison",
        locationStyle: "explicit-location",
        specificity: "named-target",
        persona: "comparison-shopper",
        wordingStyle: "conversational",
        decisionMode: "compare"
      }
    )
  ];

  for (const attribute of attributes) {
    prompts.push(
      prompt(
        `best ${category} near ${location} for ${attribute}`,
        "best {category} near {location} for {attribute}",
        `attribute-${slugify(attribute)}`,
        `Attribute-specific recommendation: ${attribute}`,
        {
          intent: "attribute-specific-recommendation",
          locationStyle: "near-location",
          specificity: "attribute-specific",
          persona: slugify(attribute) || "specific-need",
          wordingStyle: "search-like",
          decisionMode: "best"
        }
      )
    );
    prompts.push(
      prompt(
        `which ${category} should I choose in ${location} if I care about ${attribute}?`,
        "which {category} should I choose in {location} if I care about {attribute}?",
        `choice-attribute-${slugify(attribute)}`,
        `Attribute-led choice: ${attribute}`,
        {
          intent: "attribute-specific-choice",
          locationStyle: "explicit-location",
          specificity: "attribute-specific",
          persona: slugify(attribute) || "specific-need",
          wordingStyle: "conversational",
          decisionMode: "choose"
        }
      )
    );
  }

  // Broader geographic coverage: if location is "City, Region", also test the region alone
  const locationParts = location.split(",").map((s) => s.trim()).filter(Boolean);
  if (locationParts.length >= 2) {
    const region = locationParts.slice(1).join(", ");
    prompts.push(
      prompt(
        `best ${category} in ${region}`,
        "best {category} in {region}",
        "broader-region-search",
        "Broader region discovery",
        {
          intent: "best-provider",
          locationStyle: "broader-region",
          specificity: "broad-category",
          persona: "general-consumer",
          wordingStyle: "search-like",
          decisionMode: "best"
        }
      )
    );
    prompts.push(
      prompt(
        `top rated ${category} near ${location} area`,
        "top rated {category} near {location} area",
        "near-location-area",
        "Near-location area discovery",
        {
          intent: "reviews",
          locationStyle: "near-location-area",
          specificity: "broad-category",
          persona: "review-led-consumer",
          wordingStyle: "search-like",
          decisionMode: "top-rated"
        }
      )
    );
  }

  if (competitors.length > 0) {
    prompts.push(
      prompt(
        `compare ${business} with ${competitors.slice(0, 3).join(", ")} in ${location}`,
        "compare {business} with selected competitors in {location}",
        "target-vs-selected-competitors",
        "Target business comparison against named competitors",
        {
          intent: "comparison",
          locationStyle: "explicit-location",
          specificity: "named-competitors",
          persona: "comparison-shopper",
          wordingStyle: "conversational",
          decisionMode: "compare"
        }
      )
    );

    for (const competitor of competitors.slice(0, 4)) {
      prompts.push(
        prompt(
          `compare ${business} with ${competitor} in ${location}`,
          "compare {business} with {competitor} in {location}",
          `target-vs-${slugify(competitor)}`,
          `Target business comparison against ${competitor}`,
          {
            intent: "head-to-head-comparison",
            locationStyle: "explicit-location",
            specificity: "named-competitor",
            persona: "comparison-shopper",
            wordingStyle: "conversational",
            decisionMode: "compare"
          }
        )
      );
    }
  }

  return uniquePrompts(prompts);
}

export const localBusinessPack: PromptPack = {
  id: LOCAL_BUSINESS_PACK_ID,
  label: "Local business",
  description:
    "Local-intent recommendation, choice, availability, and comparison prompts for a business with a physical service area.",
  targetKinds: ["local_business"],
  generate
};
