import type { Prisma } from "@prisma/client";
import { discoverGooglePlacesLeads } from "../src/lib/audit/lead-discovery";
import { crawlOutreachContacts } from "../src/lib/audit/outreach-crawler";
import { prisma } from "../src/lib/prisma";

const category = process.env.OUTREACH_CATEGORY || "dentist";
const location = process.env.OUTREACH_LOCATION || "Woking, Surrey";
const limit = clampNumber(process.env.OUTREACH_LIMIT, 1, 20, 10);
const maxPages = clampNumber(process.env.OUTREACH_MAX_PAGES, 1, 15, 8);

async function main() {
  console.log(`Discovering ${limit} ${category} prospects around ${location}...`);
  const discovered = await discoverGooglePlacesLeads({ category, location, limit });
  const rows: Array<{
    name: string;
    website: string;
    emails: string;
    forms: number;
    contactPages: number;
    status: string;
  }> = [];

  for (const lead of discovered) {
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

    if (!lead.websiteUrl) {
      await prisma.outreachCrawl.create({
        data: {
          leadProspectId: prospect.id,
          sourceLeadName: lead.name,
          websiteUrl: null,
          normalizedUrl: null,
          status: "SKIPPED_NO_WEBSITE",
          emails: [],
          phoneNumbers: lead.phone ? [lead.phone] : [],
          contactPages: [],
          forms: [],
          notes: "Google Places did not provide a website URL."
        }
      });
      await prisma.leadProspect.update({
        where: { id: prospect.id },
        data: { status: "NO_WEBSITE" }
      });
      rows.push({
        name: lead.name,
        website: "none",
        emails: "",
        forms: 0,
        contactPages: 0,
        status: "NO_WEBSITE"
      });
      continue;
    }

    try {
      const crawl = await crawlOutreachContacts(lead.websiteUrl, maxPages);
      const usefulForms = crawl.forms.filter((form) => ["contact", "booking", "unknown"].includes(form.classification));
      const status = crawl.emails.length > 0 ? "EMAIL_FOUND" : usefulForms.length > 0 ? "FORM_FOUND" : "NO_CONTACT_FOUND";

      await prisma.outreachCrawl.create({
        data: {
          leadProspectId: prospect.id,
          sourceLeadName: lead.name,
          websiteUrl: crawl.websiteUrl,
          normalizedUrl: crawl.normalizedUrl,
          status: "COMPLETED",
          emails: crawl.emails,
          phoneNumbers: Array.from(new Set([lead.phone, ...crawl.phoneNumbers].filter((phone): phone is string => Boolean(phone)))),
          contactPages: crawl.contactPages as Prisma.InputJsonValue,
          forms: crawl.forms as Prisma.InputJsonValue,
          notes: `Scanned ${crawl.pagesScanned} public pages. Lead status: ${status}.`
        }
      });
      await prisma.leadProspect.update({
        where: { id: prospect.id },
        data: { status }
      });

      rows.push({
        name: lead.name,
        website: crawl.normalizedUrl,
        emails: crawl.emails.join(", "),
        forms: usefulForms.length,
        contactPages: crawl.contactPages.length,
        status
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown crawl error";
      await prisma.outreachCrawl.create({
        data: {
          leadProspectId: prospect.id,
          sourceLeadName: lead.name,
          websiteUrl: lead.websiteUrl,
          normalizedUrl: lead.websiteUrl,
          status: "FAILED",
          emails: [],
          phoneNumbers: lead.phone ? [lead.phone] : [],
          contactPages: [],
          forms: [],
          notes: message
        }
      });
      await prisma.leadProspect.update({
        where: { id: prospect.id },
        data: { status: "CRAWL_FAILED" }
      });
      rows.push({
        name: lead.name,
        website: lead.websiteUrl,
        emails: "",
        forms: 0,
        contactPages: 0,
        status: "CRAWL_FAILED"
      });
    }
  }

  console.table(rows);
  console.log("Saved outreach crawls to the database. Form metadata is review-only; no forms were submitted.");
}

function clampNumber(value: string | undefined, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
