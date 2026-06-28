import { NextResponse } from "next/server";
import { z } from "zod";
import { crawlWebsite } from "@/lib/audit/site-crawler";
import { inferBusinessProfile } from "@/lib/audit/site-profiler";
import { inferTargetProfile, type IntakeSignal } from "@/lib/targets/intake-agent";
import { trackEvent } from "@/lib/telemetry";

// Gate-1 step 1: take a seed (website and/or name), crawl + classify, and return
// a suggested TargetProfile for the wizard to pre-fill. No DB write — the
// Business is only created when the user confirms at /api/intake/commit.

const requestSchema = z
  .object({
    websiteUrl: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    maxPages: z.number().int().min(1).max(12).optional()
  })
  .refine((value) => value.websiteUrl || value.name, {
    message: "Provide a website URL or a name to start the audit."
  });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const signal: IntakeSignal = { name: parsed.data.name, websiteUrl: parsed.data.websiteUrl };
  let normalizedUrl: string | undefined;
  let crawlFailed = false;

  if (parsed.data.websiteUrl) {
    try {
      const crawl = await crawlWebsite(parsed.data.websiteUrl, parsed.data.maxPages);
      const inferred = inferBusinessProfile(crawl);
      normalizedUrl = crawl.normalizedUrl;
      signal.websiteUrl = crawl.normalizedUrl;
      signal.crawlSummary = crawl.summaryText;
      signal.name = signal.name ?? inferred.name;
      signal.inferred = {
        category: inferred.category,
        location: inferred.location,
        attributes: inferred.targetAttributes
      };
    } catch {
      // Crawl is best-effort. If it fails we still classify from the name alone
      // and let the user fill the rest manually.
      crawlFailed = true;
    }
  }

  const { suggestion, usedLlm } = await inferTargetProfile(signal);

  await trackEvent("intake_suggested", {
    kind: suggestion.kind,
    usedLlm,
    crawlFailed,
    hasWebsite: Boolean(parsed.data.websiteUrl)
  });

  return NextResponse.json({
    suggestion,
    websiteUrl: normalizedUrl ?? parsed.data.websiteUrl ?? null,
    usedLlm,
    crawlFailed
  });
}
