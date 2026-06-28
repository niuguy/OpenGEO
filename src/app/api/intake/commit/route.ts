import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { targetProfileSchema } from "@/lib/targets/target-profile-schema";
import { proposePrompts } from "@/lib/prompts/strategist";
import { persistGeneratedPrompts } from "@/lib/prompts/persist";
import { trackEvent } from "@/lib/telemetry";

// Gate-1 step 2: the user has confirmed the TargetProfile. Create the Business
// (DRAFT_INTAKE — not yet a running audit), run the strategist to propose DRAFT
// prompts, and hand the client off to the Gate-2 review page.

type CommitRequest = {
  profile?: unknown;
  openAiApiKey?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CommitRequest;
  const parsed = targetProfileSchema.safeParse(body.profile);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid target profile", details: parsed.error.flatten() }, { status: 400 });
  }
  const profile = parsed.data;

  const business = await prisma.business.create({
    data: {
      name: profile.name,
      category: profile.marketCategory ?? "",
      location: profile.geography ?? "",
      websiteUrl: profile.websiteUrl ?? "",
      targetAttributes: profile.attributes,
      targetKind: profile.kind,
      audience: profile.audience ?? null,
      status: "DRAFT_INTAKE",
      profile,
      competitors: {
        create: profile.comparedEntities.map((name) => ({ name }))
      }
    }
  });

  // Default to ACTIVE: the strategist already pruned irrelevant prompts, so
  // Gate-2 review is opt-out ("toggle off anything irrelevant") rather than
  // approve-each. The user still reviews before starting the audit.
  const result = await proposePrompts(profile, { apiKey: body.openAiApiKey });
  await persistGeneratedPrompts(business.id, result.prompts, { status: "ACTIVE" });

  await trackEvent("intake_committed", {
    businessId: business.id,
    targetKind: profile.kind,
    packId: result.packId,
    usedStrategist: result.usedStrategist,
    promptCount: result.prompts.length,
    competitorCount: profile.comparedEntities.length
  });

  return NextResponse.json({ businessId: business.id, usedStrategist: result.usedStrategist }, { status: 201 });
}
