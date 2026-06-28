import { targetProfileSchema } from "@/lib/targets/target-profile-schema";
import type { TargetProfile } from "@/lib/targets/target-profile";

export type ResolvableBusiness = {
  name: string;
  category: string;
  location: string;
  websiteUrl: string;
  targetAttributes: string[];
  targetKind: string;
  audience: string | null;
  profile: unknown;
  competitors: { name: string }[];
};

// Prefer the stored TargetProfile snapshot (written at intake); fall back to
// reconstructing one from the Business columns. The fallback covers rows created
// before the agentic intake flow, where targetKind defaults to local_business.
export function resolveTargetProfile(business: ResolvableBusiness): TargetProfile {
  if (business.profile) {
    const parsed = targetProfileSchema.safeParse(business.profile);
    if (parsed.success) {
      return parsed.data as TargetProfile;
    }
  }

  const isLocal = business.targetKind === "local_business";
  return {
    name: business.name,
    kind: (business.targetKind as TargetProfile["kind"]) ?? "local_business",
    websiteUrl: business.websiteUrl || undefined,
    marketCategory: business.category || undefined,
    geography: isLocal && business.location ? business.location : undefined,
    audience: business.audience ?? undefined,
    attributes: business.targetAttributes,
    comparedEntities: business.competitors.map((competitor) => competitor.name)
  };
}
