import { NextResponse } from "next/server";
import { generatePromptsForBusiness } from "@/lib/prompts";
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

  const prompts = generatePromptsForBusiness({
    name: business.name,
    category: business.category,
    location: business.location,
    competitors: business.competitors.map((competitor) => competitor.name),
    attributes: business.targetAttributes
  });

  const records = [];
  for (const prompt of prompts) {
    const record = await prisma.prompt.upsert({
      where: {
        businessId_text: {
          businessId: business.id,
          text: prompt.text
        }
      },
      update: {
        template: prompt.template,
        clusterId: prompt.clusterId,
        clusterIntent: prompt.clusterIntent,
        samplingBasis: prompt.samplingBasis,
        status: "ACTIVE"
      },
      create: {
        businessId: business.id,
        text: prompt.text,
        template: prompt.template,
        clusterId: prompt.clusterId,
        clusterIntent: prompt.clusterIntent,
        samplingBasis: prompt.samplingBasis
      }
    });
    records.push(record);
  }

  await trackEvent("prompts_generated", {
    businessId: business.id,
    category: business.category,
    location: business.location,
    promptCount: records.length
  });

  return NextResponse.json({ prompts: records });
}
