import { NextResponse } from "next/server";
import { z } from "zod";
import { crawlWebsite } from "@/lib/audit/site-crawler";
import { inferBusinessProfile } from "@/lib/audit/site-profiler";
import { generatePromptsForBusiness } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/telemetry";

const requestSchema = z.object({
  websiteUrl: z.string().trim().min(1),
  maxPages: z.number().int().min(1).max(12).optional(),
  createAudit: z.boolean().default(true)
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid website audit payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const crawl = await crawlWebsite(parsed.data.websiteUrl, parsed.data.maxPages);
    const profile = inferBusinessProfile(crawl);

    const business = parsed.data.createAudit
      ? await prisma.business.create({
          data: {
            name: profile.name,
            category: profile.category,
            location: profile.location,
            websiteUrl: crawl.normalizedUrl,
            targetAttributes: profile.targetAttributes
          }
        })
      : null;

    const prompts = business
      ? generatePromptsForBusiness({
          name: business.name,
          category: business.category,
          location: business.location,
          competitors: [],
          attributes: business.targetAttributes
        })
      : [];

    if (business) {
      await prisma.prompt.createMany({
        data: prompts.map((prompt) => ({
          businessId: business.id,
          text: prompt.text,
          template: prompt.template,
          clusterId: prompt.clusterId,
          clusterIntent: prompt.clusterIntent,
          samplingBasis: prompt.samplingBasis
        })),
        skipDuplicates: true
      });
    }

    const audit = await prisma.websiteAudit.create({
      data: {
        websiteUrl: parsed.data.websiteUrl,
        normalizedUrl: crawl.normalizedUrl,
        businessId: business?.id,
        inferredName: profile.name,
        inferredCategory: profile.category,
        inferredLocation: profile.location,
        inferredAttributes: profile.targetAttributes,
        pages: crawl.pages,
        summaryText: crawl.summaryText.slice(0, 20000)
      }
    });

    await trackEvent("website_audit_created", {
      websiteAuditId: audit.id,
      businessId: business?.id ?? null,
      normalizedUrl: crawl.normalizedUrl,
      pageCount: crawl.pages.length,
      promptCount: prompts.length
    });

    return NextResponse.json({
      audit,
      business,
      promptCount: prompts.length,
      pages: crawl.pages.map((page) => ({
        url: page.url,
        title: page.title,
        headings: page.headings.slice(0, 8),
        schemaTypes: page.schemaTypes
      }))
    });
  } catch (error) {
    const audit = await prisma.websiteAudit.create({
      data: {
        websiteUrl: parsed.data.websiteUrl,
        normalizedUrl: parsed.data.websiteUrl,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown website audit error",
        inferredAttributes: [],
        pages: [],
        summaryText: ""
      }
    });

    return NextResponse.json(
      { error: audit.error || "Website audit failed", auditId: audit.id },
      { status: 502 }
    );
  }
}
