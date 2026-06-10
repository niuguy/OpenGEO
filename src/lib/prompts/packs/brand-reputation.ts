import type { GeneratedPrompt, PromptPack, PromptPackInput, SamplingBasis } from "@/lib/prompts/types";
import { slugify, uniquePrompts } from "@/lib/prompts/types";

export const BRAND_REPUTATION_PACK_ID = "brand-reputation";

// Non-local basis vocabulary: `aspect` replaces locationStyle/decisionMode.
// It records which reputation dimension the prompt samples (identity, quality,
// trust, sentiment, comparison, ...), keeping the stratified audit trail.
function buildPrompt(
  text: string,
  template: string,
  clusterId: string,
  clusterIntent: string,
  samplingBasis: SamplingBasis
): GeneratedPrompt {
  return {
    text,
    template,
    clusterId,
    clusterIntent,
    packId: BRAND_REPUTATION_PACK_ID,
    samplingBasis
  };
}

function generate(input: PromptPackInput): GeneratedPrompt[] {
  const target = input.targetName.trim();
  const category = (input.marketCategory ?? "").trim();
  const audience = (input.audience ?? "").trim();
  const attributes = input.attributes.map((attribute) => attribute.trim()).filter(Boolean);
  const compared = input.comparedEntities.map((name) => name.trim()).filter(Boolean);

  const prompt = buildPrompt;

  const prompts: GeneratedPrompt[] = [
    prompt(
      `what is ${target}?`,
      "what is {target}?",
      "brand-identity",
      "Brand awareness and identity",
      {
        intent: "awareness",
        aspect: "identity",
        specificity: "named-target",
        persona: "curious-researcher",
        wordingStyle: "conversational"
      }
    ),
    prompt(
      `is ${target} any good?`,
      "is {target} any good?",
      "brand-quality",
      "Overall quality judgement",
      {
        intent: "quality-judgement",
        aspect: "quality",
        specificity: "named-target",
        persona: "evaluating-buyer",
        wordingStyle: "conversational"
      }
    ),
    prompt(
      `is ${target} trustworthy?`,
      "is {target} trustworthy?",
      "brand-trust",
      "Trust and legitimacy check",
      {
        intent: "trust",
        aspect: "trust",
        specificity: "named-target",
        persona: "cautious-buyer",
        wordingStyle: "conversational"
      }
    ),
    prompt(
      `what do people say about ${target}?`,
      "what do people say about {target}?",
      "brand-sentiment",
      "Public sentiment and reviews",
      {
        intent: "sentiment",
        aspect: "sentiment",
        specificity: "named-target",
        persona: "review-led-consumer",
        wordingStyle: "conversational"
      }
    ),
    prompt(
      `what are the pros and cons of ${target}?`,
      "what are the pros and cons of {target}?",
      "brand-pros-cons",
      "Strengths and weaknesses",
      {
        intent: "evaluation",
        aspect: "strengths-weaknesses",
        specificity: "named-target",
        persona: "evaluating-buyer",
        wordingStyle: "conversational"
      }
    ),
    prompt(
      `what is ${target} known for?`,
      "what is {target} known for?",
      "brand-positioning",
      "Perceived positioning and claims",
      {
        intent: "positioning",
        aspect: "claims",
        specificity: "named-target",
        persona: "curious-researcher",
        wordingStyle: "conversational"
      }
    ),
    prompt(
      `would you recommend ${target}?`,
      "would you recommend {target}?",
      "brand-recommendation",
      "Direct recommendation stance",
      {
        intent: "recommendation",
        aspect: "recommendation",
        specificity: "named-target",
        persona: "evaluating-buyer",
        wordingStyle: "conversational"
      }
    ),
    prompt(
      `what are the best alternatives to ${target}?`,
      "what are the best alternatives to {target}?",
      "brand-alternatives",
      "Alternatives and substitutes discovery",
      {
        intent: "alternatives",
        aspect: "comparison",
        specificity: "named-target",
        persona: "comparison-shopper",
        wordingStyle: "search-like"
      }
    )
  ];

  if (category) {
    prompts.push(
      prompt(
        `what are the best ${category} options right now?`,
        "what are the best {category} options right now?",
        "category-discovery",
        "Unprompted category discovery",
        {
          intent: "category-discovery",
          aspect: "visibility",
          specificity: "broad-category",
          persona: "general-consumer",
          wordingStyle: "conversational"
        }
      )
    );
    prompts.push(
      prompt(
        `which ${category} should I choose?`,
        "which {category} should I choose?",
        "category-choice",
        "Selection advice within the category",
        {
          intent: "category-choice",
          aspect: "visibility",
          specificity: "broad-category",
          persona: "evaluating-buyer",
          wordingStyle: "conversational"
        }
      )
    );
    prompts.push(
      prompt(
        `is ${target} a good ${category}?`,
        "is {target} a good {category}?",
        "category-fit",
        "Category fit judgement",
        {
          intent: "quality-judgement",
          aspect: "category-fit",
          specificity: "named-target",
          persona: "evaluating-buyer",
          wordingStyle: "conversational"
        }
      )
    );
  }

  if (category && audience) {
    prompts.push(
      prompt(
        `what is the best ${category} for ${audience}?`,
        "what is the best {category} for {audience}?",
        "audience-category-discovery",
        "Audience-specific category discovery",
        {
          intent: "category-discovery",
          aspect: "visibility",
          specificity: "audience-specific",
          persona: slugify(audience) || "specific-audience",
          wordingStyle: "search-like"
        }
      )
    );
  }

  if (audience) {
    prompts.push(
      prompt(
        `is ${target} a good choice for ${audience}?`,
        "is {target} a good choice for {audience}?",
        "audience-fit",
        "Audience fit judgement",
        {
          intent: "quality-judgement",
          aspect: "audience-fit",
          specificity: "audience-specific",
          persona: slugify(audience) || "specific-audience",
          wordingStyle: "conversational"
        }
      )
    );
  }

  for (const attribute of attributes) {
    prompts.push(
      prompt(
        `is ${target} good for ${attribute}?`,
        "is {target} good for {attribute}?",
        `attribute-${slugify(attribute)}`,
        `Attribute-specific judgement: ${attribute}`,
        {
          intent: "attribute-specific-judgement",
          aspect: "attribute-fit",
          specificity: "attribute-specific",
          persona: slugify(attribute) || "specific-need",
          wordingStyle: "conversational"
        }
      )
    );
    if (category) {
      prompts.push(
        prompt(
          `which ${category} is best for ${attribute}?`,
          "which {category} is best for {attribute}?",
          `category-attribute-${slugify(attribute)}`,
          `Attribute-led category discovery: ${attribute}`,
          {
            intent: "attribute-specific-discovery",
            aspect: "visibility",
            specificity: "attribute-specific",
            persona: slugify(attribute) || "specific-need",
            wordingStyle: "search-like"
          }
        )
      );
    }
  }

  if (compared.length > 0) {
    prompts.push(
      prompt(
        `how does ${target} compare to ${compared.slice(0, 3).join(", ")}?`,
        "how does {target} compare to selected competitors?",
        "target-vs-selected-competitors",
        "Target comparison against named competitors",
        {
          intent: "comparison",
          aspect: "comparison",
          specificity: "named-competitors",
          persona: "comparison-shopper",
          wordingStyle: "conversational"
        }
      )
    );

    for (const competitor of compared.slice(0, 4)) {
      prompts.push(
        prompt(
          `${target} vs ${competitor}: which is better?`,
          "{target} vs {competitor}: which is better?",
          `target-vs-${slugify(competitor)}`,
          `Head-to-head comparison against ${competitor}`,
          {
            intent: "head-to-head-comparison",
            aspect: "comparison",
            specificity: "named-competitor",
            persona: "comparison-shopper",
            wordingStyle: "search-like"
          }
        )
      );
    }
  }

  return uniquePrompts(prompts);
}

export const brandReputationPack: PromptPack = {
  id: BRAND_REPUTATION_PACK_ID,
  label: "Brand reputation",
  description:
    "Awareness, sentiment, trust, claims, and comparison prompts for any brand, product, publisher, person, or organization.",
  targetKinds: ["saas", "ecommerce", "publisher", "person", "org", "developer_tool", "local_business"],
  generate
};
