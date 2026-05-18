import { AuditMachine } from "@/components/audit-machine";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${Math.round(value)}%` : "n/a";
}

function formatRank(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(1) : "n/a";
}

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

export default async function AuditMachinePage() {
  const [
    businessCount,
    leadCount,
    websiteAuditCount,
    completedRunCount,
    recentWebsiteAudits,
    prospects,
    businesses
  ] = await prisma.$transaction([
    prisma.business.count(),
    prisma.leadProspect.count(),
    prisma.websiteAudit.count(),
    prisma.promptRun.count({ where: { status: "COMPLETED" } }),
    prisma.websiteAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        business: true
      }
    }),
    prisma.leadProspect.findMany({
      orderBy: [{ reviewCount: "desc" }, { rating: "desc" }],
      take: 12
    }),
    prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: {
          select: {
            prompts: true,
            competitors: true
          }
        },
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 8
        },
        prompts: {
          select: {
            runs: {
              where: { status: "COMPLETED" },
              select: {
                id: true,
                provider: true
              }
            }
          }
        },
        websiteAudits: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    })
  ]);

  const auditedWebsiteUrls = new Set(
    businesses
      .map((business) => normalizeUrl(business.websiteUrl))
      .filter((value): value is string => Boolean(value))
  );
  const topProspects = prospects.map((lead) => ({
    ...lead,
    audited: lead.websiteUrl ? auditedWebsiteUrls.has(normalizeUrl(lead.websiteUrl) ?? "") : false
  }));
  const auditRows = businesses.map((business) => {
    const latestSnapshot =
      business.snapshots.find((snapshot) => snapshot.provider === "chatgpt") ?? business.snapshots[0] ?? null;
    const runs = business.prompts.flatMap((prompt) => prompt.runs);
    const providers = new Set(runs.map((run) => run.provider));

    return {
      business,
      source: business.websiteAudits.length > 0 ? "Website audit" : "Manual",
      latestSnapshot,
      completedRuns: runs.length,
      providers: providers.size
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Audit machine</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Create audits and find local prospects</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Turn a public website into an AI visibility audit, or discover local prospects through Google Places before
          auditing and pitching them.
        </p>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Audits", String(businessCount)],
          ["Website crawls", String(websiteAuditCount)],
          ["Prospects", String(leadCount)],
          ["Completed AI runs", String(completedRunCount)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">AI visibility audit pipeline</h2>
            <p className="mt-1 text-sm text-muted">Latest audits with prompt coverage, provider samples, and visibility metrics.</p>
          </div>
          <Link href="/businesses" className="focus-ring rounded-md border border-line px-3 py-2 text-sm font-medium">
            All audits
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="py-2 font-medium">Audit</th>
                <th className="py-2 font-medium">Source</th>
                <th className="py-2 font-medium">Prompts</th>
                <th className="py-2 font-medium">Runs</th>
                <th className="py-2 font-medium">Providers</th>
                <th className="py-2 font-medium">Visibility</th>
                <th className="py-2 font-medium">Share</th>
                <th className="py-2 font-medium">Avg position</th>
                <th className="py-2 font-medium">Consistency</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted" colSpan={9}>
                    No audits yet.
                  </td>
                </tr>
              ) : (
                auditRows.map((row) => (
                  <tr key={row.business.id} className="border-b border-line last:border-0">
                    <td className="py-3">
                      <Link href={`/businesses/${row.business.id}`} className="font-medium text-accent hover:underline">
                        {row.business.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {row.business.category} · {row.business.location}
                      </p>
                    </td>
                    <td className="py-3 text-muted">{row.source}</td>
                    <td className="py-3 text-muted">{row.business._count.prompts}</td>
                    <td className="py-3 text-muted">{row.completedRuns}</td>
                    <td className="py-3 text-muted">{row.providers}</td>
                    <td className="py-3 text-muted">{formatPercent(row.latestSnapshot?.visibilityScore)}</td>
                    <td className="py-3 text-muted">{formatPercent(row.latestSnapshot?.shareOfVoice)}</td>
                    <td className="py-3 text-muted">{formatRank(row.latestSnapshot?.averageRank)}</td>
                    <td className="py-3 text-muted">{formatPercent(row.latestSnapshot?.recommendationConsistency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Prospect queue</h2>
          <div className="mt-4 space-y-3">
            {topProspects.length === 0 ? (
              <p className="text-sm text-muted">No prospects discovered yet.</p>
            ) : (
              topProspects.map((lead) => (
                <div key={lead.id} className="border-b border-line pb-3 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{lead.name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {lead.category} · {lead.location}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {lead.rating ?? "n/a"} stars · {lead.reviewCount ?? 0} reviews
                      </p>
                    </div>
                    <span className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-muted">
                      {lead.audited ? "Audited" : "Prospect"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {lead.websiteUrl ? (
                      <a href={lead.websiteUrl} className="text-accent underline">
                        Website
                      </a>
                    ) : null}
                    {lead.mapsUrl ? (
                      <a href={lead.mapsUrl} className="text-accent underline">
                        Map listing
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Recent website crawls</h2>
          <div className="mt-4 space-y-3">
            {recentWebsiteAudits.length === 0 ? (
              <p className="text-sm text-muted">No website crawls yet.</p>
            ) : (
              recentWebsiteAudits.map((audit) => (
                <div key={audit.id} className="border-b border-line pb-3 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{audit.inferredName ?? audit.normalizedUrl}</p>
                      <p className="mt-1 text-sm text-muted">
                        {audit.inferredCategory ?? "unknown"} · {audit.inferredLocation ?? "unknown"}
                      </p>
                    </div>
                    <span className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-muted">{audit.status}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{audit.normalizedUrl}</p>
                  {audit.business ? (
                    <Link href={`/businesses/${audit.business.id}`} className="mt-2 inline-block text-sm text-accent underline">
                      Open audit
                    </Link>
                  ) : null}
                  {audit.error ? <p className="mt-2 text-sm text-red-700">{audit.error}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="mt-6">
        <AuditMachine />
      </div>
    </div>
  );
}
