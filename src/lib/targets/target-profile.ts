import type { PromptPackInput } from "@/lib/prompts/types";

// Internal generic-target abstraction (plan Phase 1). `Business` stays the
// storage model for now; new code paths should accept a TargetProfile and use
// the adapters below instead of reading Business fields directly.

export type TargetKind =
  | "local_business"
  | "saas"
  | "ecommerce"
  | "publisher"
  | "person"
  | "org"
  | "developer_tool";

export type TargetProfile = {
  name: string;
  kind: TargetKind;
  websiteUrl?: string;
  marketCategory?: string;
  geography?: string;
  audience?: string;
  attributes: string[];
  comparedEntities: string[];
};

export type BusinessLike = {
  name: string;
  category: string;
  location: string;
  websiteUrl?: string | null;
  targetAttributes: string[];
};

// Mapping per plan §3.1: category → marketCategory, location → geography,
// targetAttributes → attributes. Existing Business rows are all local.
export function businessToTargetProfile(
  business: BusinessLike,
  comparedEntities: string[] = []
): TargetProfile {
  return {
    name: business.name,
    kind: "local_business",
    websiteUrl: business.websiteUrl ?? undefined,
    marketCategory: business.category,
    geography: business.location,
    attributes: business.targetAttributes,
    comparedEntities
  };
}

export function targetProfileToPromptPackInput(profile: TargetProfile): PromptPackInput {
  return {
    targetName: profile.name,
    targetKind: profile.kind,
    marketCategory: profile.marketCategory,
    geography: profile.geography,
    audience: profile.audience,
    attributes: profile.attributes,
    comparedEntities: profile.comparedEntities
  };
}
