import type { GeneratedPrompt } from "@/lib/prompts/types";
import { localBusinessPack } from "@/lib/prompts/packs/local-business";
import { businessToTargetProfile, targetProfileToPromptPackInput } from "@/lib/targets/target-profile";

export type { GeneratedPrompt, PromptPack, PromptPackInput, SamplingBasis } from "@/lib/prompts/types";

export type PromptBusinessInput = {
  name: string;
  category: string;
  location: string;
  competitors: string[];
  attributes: string[];
};

// Legacy entry point, kept for existing Business-shaped callers. It routes
// through the TargetProfile adapter and the local-business prompt pack so
// every caller exercises the generic path (plan Phase 1+2).
export function generatePromptsForBusiness(input: PromptBusinessInput): GeneratedPrompt[] {
  const profile = businessToTargetProfile(
    {
      name: input.name,
      category: input.category,
      location: input.location,
      targetAttributes: input.attributes
    },
    input.competitors
  );
  return localBusinessPack.generate(targetProfileToPromptPackInput(profile));
}
