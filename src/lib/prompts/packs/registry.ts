import type { PromptPack } from "@/lib/prompts/types";
import { localBusinessPack } from "@/lib/prompts/packs/local-business";
import { brandReputationPack } from "@/lib/prompts/packs/brand-reputation";

export const promptPacks: PromptPack[] = [localBusinessPack, brandReputationPack];

export function getPromptPack(packId: string): PromptPack | undefined {
  return promptPacks.find((pack) => pack.id === packId);
}

export function getPacksForTargetKind(targetKind: string): PromptPack[] {
  return promptPacks.filter((pack) => pack.targetKinds.includes(targetKind));
}

// Local businesses keep their mature pack; every other kind starts from
// brand-reputation, the pack that works without local fields.
export function defaultPackForTargetKind(targetKind: string): PromptPack {
  if (targetKind === "local_business") {
    return localBusinessPack;
  }
  const candidates = getPacksForTargetKind(targetKind);
  return candidates[0] ?? brandReputationPack;
}
