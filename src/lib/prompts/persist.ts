import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { GeneratedPrompt } from "@/lib/prompts";

export const customPromptInputSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(8, "Prompt must be at least 8 characters").max(500, "Prompt must be at most 500 characters"));

export type PersistGeneratedOptions = {
  status?: "DRAFT" | "ACTIVE";
};

// Prompts may optionally carry a strategist rationale (the one-line "why" shown
// at the Gate-2 review). Plain pack output has none; that's fine.
type PersistablePrompt = GeneratedPrompt & { rationale?: string | null };

export async function persistGeneratedPrompts(
  businessId: string,
  generated: PersistablePrompt[],
  options: PersistGeneratedOptions = {}
) {
  const status = options.status ?? "DRAFT";

  for (const prompt of generated) {
    // packId rides inside the samplingBasis JSON until the Prompt table grows
    // a real column (plan Phase 5); avoids a migration in the adapter phase.
    const samplingBasis = { packId: prompt.packId, ...prompt.samplingBasis };
    const rationale = prompt.rationale ?? null;
    await prisma.prompt.upsert({
      where: { businessId_text: { businessId, text: prompt.text } },
      update: {
        template: prompt.template,
        clusterId: prompt.clusterId,
        clusterIntent: prompt.clusterIntent,
        samplingBasis,
        rationale
      },
      create: {
        businessId,
        text: prompt.text,
        template: prompt.template,
        clusterId: prompt.clusterId,
        clusterIntent: prompt.clusterIntent,
        samplingBasis,
        rationale,
        status,
        source: "generated"
      }
    });
  }

  // Archive generated prompts no longer in the new set. User-added prompts
  // are scoped out so the next regeneration never silently deletes them.
  await prisma.prompt.updateMany({
    where: {
      businessId,
      source: "generated",
      status: { in: ["DRAFT", "ACTIVE"] },
      text: { notIn: generated.map((p) => p.text) }
    },
    data: { status: "ARCHIVED" }
  });
}

export type PersistUserPromptResult =
  | { ok: true; promptId: string }
  | { ok: false; reason: "validation"; message: string }
  | { ok: false; reason: "duplicate"; existingPromptId: string };

export async function persistUserPrompt(
  businessId: string,
  rawText: string
): Promise<PersistUserPromptResult> {
  const parsed = customPromptInputSchema.safeParse(rawText);
  if (!parsed.success) {
    return { ok: false, reason: "validation", message: parsed.error.issues[0]?.message ?? "Invalid prompt" };
  }
  const text = parsed.data;

  const existing = await prisma.prompt.findUnique({
    where: { businessId_text: { businessId, text } },
    select: { id: true }
  });
  if (existing) {
    return { ok: false, reason: "duplicate", existingPromptId: existing.id };
  }

  const created = await prisma.prompt.create({
    data: {
      businessId,
      text,
      template: "user-custom",
      clusterId: "user-custom",
      clusterIntent: "user-custom",
      samplingBasis: { intent: "user-custom" },
      status: "ACTIVE",
      source: "user"
    },
    select: { id: true }
  });

  return { ok: true, promptId: created.id };
}
