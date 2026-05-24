import { NextResponse } from "next/server";
import { generatePromptsForBusiness } from "@/lib/prompts";
import { persistGeneratedPrompts } from "@/lib/prompts/persist";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/telemetry";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      competitors: true
    }
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const generated = generatePromptsForBusiness({
    name: business.name,
    category: business.category,
    location: business.location,
    competitors: business.competitors.map((competitor) => competitor.name),
    attributes: business.targetAttributes
  });

  await persistGeneratedPrompts(business.id, generated);

  const records = await prisma.prompt.findMany({
    where: { businessId: business.id, source: "generated" },
    orderBy: { createdAt: "asc" }
  });

  await trackEvent("prompts_generated", {
    businessId: business.id,
    category: business.category,
    location: business.location,
    promptCount: generated.length
  });

  return NextResponse.json({ prompts: records });
}
