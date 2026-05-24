import { NextResponse } from "next/server";
import { createBusinessSchema } from "@/lib/business-schema";
import { prisma } from "@/lib/prisma";
import { generatePromptsForBusiness } from "@/lib/prompts";
import { persistGeneratedPrompts } from "@/lib/prompts/persist";
import { trackEvent } from "@/lib/telemetry";

export async function GET() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          competitors: true,
          prompts: true
        }
      }
    }
  });

  return NextResponse.json({ businesses });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = createBusinessSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid business payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const business = await prisma.business.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      location: parsed.data.location,
      websiteUrl: parsed.data.websiteUrl,
      targetAttributes: parsed.data.targetAttributes,
      competitors: {
        create: parsed.data.competitors.map((name) => ({ name }))
      }
    },
    include: {
      competitors: true
    }
  });

  const generated = generatePromptsForBusiness({
    name: business.name,
    category: business.category,
    location: business.location,
    competitors: business.competitors.map((c) => c.name),
    attributes: business.targetAttributes
  });
  await persistGeneratedPrompts(business.id, generated);

  await trackEvent("business_created", {
    businessId: business.id,
    category: business.category,
    location: business.location,
    competitorCount: business.competitors.length,
    attributeCount: business.targetAttributes.length,
    generatedPromptCount: generated.length
  });

  return NextResponse.json({ business }, { status: 201 });
}
