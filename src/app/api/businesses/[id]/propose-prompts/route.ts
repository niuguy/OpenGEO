import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proposePrompts } from "@/lib/prompts/strategist";
import { persistGeneratedPrompts } from "@/lib/prompts/persist";
import { resolveTargetProfile } from "@/lib/targets/resolve-business-profile";
import { trackEvent } from "@/lib/telemetry";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ProposeRequest = {
  openAiApiKey?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as ProposeRequest;

  const business = await prisma.business.findUnique({
    where: { id },
    include: { competitors: true }
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const profile = resolveTargetProfile(business);

  const result = await proposePrompts(profile, { apiKey: body.openAiApiKey });
  await persistGeneratedPrompts(business.id, result.prompts, { status: "DRAFT" });

  const records = await prisma.prompt.findMany({
    where: { businessId: business.id, source: "generated", status: { in: ["DRAFT", "ACTIVE"] } },
    orderBy: { createdAt: "asc" }
  });

  await trackEvent("prompts_proposed", {
    businessId: business.id,
    targetKind: profile.kind,
    packId: result.packId,
    usedStrategist: result.usedStrategist,
    promptCount: result.prompts.length
  });

  return NextResponse.json({
    packId: result.packId,
    usedStrategist: result.usedStrategist,
    prompts: records
  });
}
