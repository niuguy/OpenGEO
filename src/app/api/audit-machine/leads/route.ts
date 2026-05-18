import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { discoverGooglePlacesLeads } from "@/lib/audit/lead-discovery";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/telemetry";

const requestSchema = z.object({
  category: z.string().trim().min(1),
  location: z.string().trim().min(1),
  limit: z.number().int().min(1).max(20).optional()
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead discovery payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const leads = await discoverGooglePlacesLeads(parsed.data);
    const saved = [];

    for (const lead of leads) {
      const prospect = await prisma.leadProspect.upsert({
        where: {
          source_sourceId: {
            source: lead.source,
            sourceId: lead.sourceId
          }
        },
        update: {
          name: lead.name,
          category: lead.category,
          location: lead.location,
          websiteUrl: lead.websiteUrl,
          phone: lead.phone,
          rating: lead.rating,
          reviewCount: lead.reviewCount,
          address: lead.address,
          mapsUrl: lead.mapsUrl,
          raw: lead.raw as Prisma.InputJsonValue
        },
        create: {
          source: lead.source,
          sourceId: lead.sourceId,
          name: lead.name,
          category: lead.category,
          location: lead.location,
          websiteUrl: lead.websiteUrl,
          phone: lead.phone,
          rating: lead.rating,
          reviewCount: lead.reviewCount,
          address: lead.address,
          mapsUrl: lead.mapsUrl,
          raw: lead.raw as Prisma.InputJsonValue
        }
      });
      saved.push(prospect);
    }

    await trackEvent("lead_prospects_discovered", {
      category: parsed.data.category,
      location: parsed.data.location,
      count: saved.length,
      source: "google_places"
    });

    return NextResponse.json({ leads: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lead discovery failed" },
      { status: 502 }
    );
  }
}
