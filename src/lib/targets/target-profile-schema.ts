import { z } from "zod";
import type { TargetKind, TargetProfile } from "@/lib/targets/target-profile";

// Zod mirror of the TargetProfile type (target-profile.ts). This is the
// validated contract the intake wizard fills and the prompt strategist consumes
// — replacing the implicit "Business fields" contract the rigid form assumed.
// The hand-written TargetProfile type stays the canonical TS shape; the two are
// kept structurally identical and a compile-time check below guards drift.

export const targetKindSchema = z.enum([
  "local_business",
  "saas",
  "ecommerce",
  "publisher",
  "person",
  "org",
  "developer_tool"
]);

export const targetProfileSchema = z.object({
  name: z.string().trim().min(1, "Target name is required"),
  kind: targetKindSchema,
  websiteUrl: z.string().trim().url().optional(),
  // marketCategory replaces the local-only "category"; geography is the
  // local-only field and is absent for national/public brands.
  marketCategory: z.string().trim().min(1).optional(),
  geography: z.string().trim().min(1).optional(),
  audience: z.string().trim().min(1).optional(),
  attributes: z.array(z.string().trim().min(1)).default([]),
  comparedEntities: z.array(z.string().trim().min(1)).default([])
});

export type TargetProfileInput = z.infer<typeof targetProfileSchema>;

// Compile-time guard: TargetProfileInput must remain assignable to TargetProfile.
// If the hand-written type and this schema drift, this stops type-checking.
const _schemaMatchesType: TargetProfile = {} as TargetProfileInput;
void _schemaMatchesType;

export function isLocalKind(kind: TargetKind): boolean {
  return kind === "local_business";
}
