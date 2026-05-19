import { AuditMachine } from "@/components/audit-machine";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui-extras";

export default async function AuditMachinePage() {
  const recentAudits = await prisma.websiteAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      business: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <Badge variant="accent" className="mb-4">
          Analysis Tool
        </Badge>
        <h1 className="text-4xl font-semibold text-ink sm:text-5xl">
          Website to AI Visibility Audit
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
          Turn any public website into a comprehensive AI search visibility
          report. We'll crawl the site, infer the business profile, and generate
          a baseline prompt set to measure your performance across ChatGPT,
          Gemini, and Google.
        </p>
      </div>

      <div className="mt-12 flex justify-center">
        <div className="w-full max-w-2xl">
          <AuditMachine mode="website-only" />
        </div>
      </div>

      {recentAudits.length > 0 && (
        <section className="mt-20">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-ink">
              Recent Website Audits
            </h2>
            <Link
              href="/businesses"
              className="text-sm font-medium text-accent hover:underline"
            >
              View all reports &rarr;
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentAudits.map((audit) => (
              <div
                key={audit.id}
                className="rounded-lg border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {audit.inferredName || audit.normalizedUrl}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {audit.inferredCategory || "Business"} ·{" "}
                      {audit.inferredLocation || "Local"}
                    </p>
                  </div>
                  <Badge>{audit.status}</Badge>
                </div>
                <p className="mt-3 truncate text-xs text-muted">
                  {audit.normalizedUrl}
                </p>
                {audit.business && (
                  <Link
                    href={`/businesses/${audit.business.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-line py-2 text-xs font-bold uppercase tracking-wider text-ink transition-colors hover:bg-panel"
                  >
                    View Report
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
