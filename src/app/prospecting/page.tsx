import { AuditMachine } from "@/components/audit-machine";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui-extras";

function normalizeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
}

export default async function ProspectingPage() {
  const [recentWebsiteAudits, prospects, businesses] =
    await prisma.$transaction([
      prisma.websiteAudit.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          business: true,
        },
      }),
      prisma.leadProspect.findMany({
        orderBy: [{ reviewCount: "desc" }, { rating: "desc" }],
        take: 12,
      }),
      prisma.business.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { websiteUrl: true },
      }),
    ]);

  const auditedWebsiteUrls = new Set(
    businesses
      .map((business) => normalizeUrl(business.websiteUrl))
      .filter((value): value is string => Boolean(value)),
  );

  const topProspects = prospects.map((lead) => ({
    ...lead,
    audited: lead.websiteUrl
      ? auditedWebsiteUrls.has(normalizeUrl(lead.websiteUrl) ?? "")
      : false,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10">
        <Badge variant="accent" className="mb-3">
          Agency Lead Gen
        </Badge>
        <h1 className="text-3xl font-semibold text-ink">
          Lead Discovery & Prospecting
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Find local prospects through Google Places and crawl their websites to
          identify visibility gaps. Audited prospects will be marked in the
          queue.
        </p>
      </div>

      <div className="mb-16">
        <AuditMachine mode="leads-only" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-ink text-lg font-bold uppercase tracking-wide">
              Prospect Queue
            </h2>
            <p className="text-sm text-muted mt-1">
              Discovered local leads sorted by review count and rating.
            </p>
          </div>
          <div className="space-y-4">
            {topProspects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-10 text-center">
                <p className="text-sm text-muted">
                  No prospects discovered yet. Use the tool above to find leads.
                </p>
              </div>
            ) : (
              topProspects.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-lg border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{lead.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {lead.category} · {lead.location}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                        <span className="flex items-center font-bold text-yellow-600">
                          ★ {lead.rating ?? "n/a"}
                        </span>
                        <span>·</span>
                        <span>{lead.reviewCount ?? 0} reviews</span>
                      </div>
                    </div>
                    <Badge variant={lead.audited ? "accent" : "default"}>
                      {lead.audited ? "Audited" : "Prospect"}
                    </Badge>
                  </div>
                  <p className="mt-3 truncate text-xs text-muted">
                    {lead.address}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs">
                    {lead.websiteUrl && (
                      <a
                        href={lead.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-accent hover:underline"
                      >
                        Website
                      </a>
                    )}
                    {lead.mapsUrl && (
                      <a
                        href={lead.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-accent hover:underline"
                      >
                        Google Maps
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-ink text-lg font-bold uppercase tracking-wide">
              Recent Lead Crawls
            </h2>
            <p className="text-sm text-muted mt-1">
              Status of recently triggered website audits for prospects.
            </p>
          </div>
          <div className="space-y-4">
            {recentWebsiteAudits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-10 text-center">
                <p className="text-sm text-muted">No crawls yet.</p>
              </div>
            ) : (
              recentWebsiteAudits.map((audit) => (
                <div
                  key={audit.id}
                  className="rounded-lg border border-line bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {audit.inferredName || audit.normalizedUrl}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {audit.normalizedUrl}
                      </p>
                    </div>
                    <Badge>{audit.status}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <p className="text-[10px] text-muted uppercase tracking-wider">
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </p>
                    {audit.business && (
                      <Link
                        href={`/businesses/${audit.business.id}`}
                        className="text-xs font-bold text-accent hover:underline"
                      >
                        Open Analysis &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
