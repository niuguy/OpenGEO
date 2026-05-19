import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT !== "true") {
    return [];
  }

  const businesses = await prisma.business.findMany({
    select: { id: true }
  });

  return businesses.map((business) => ({ id: business.id }));
}

export default async function RunsPage({ params }: Props) {
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      prompts: {
        orderBy: { createdAt: "asc" },
        include: {
          runs: {
            orderBy: { runAt: "desc" },
            include: {
              extractionResult: {
                include: {
                  mentionedBusinesses: true,
                  semanticAttributes: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!business) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Raw runs</h1>
          <p className="mt-2 text-sm text-muted">{business.name}</p>
        </div>
        <Link href={`/businesses/${business.id}`} className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-medium">
          Dashboard
        </Link>
      </div>

      <div className="mt-6 space-y-5">
        {business.prompts.map((prompt) => (
          <section key={prompt.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">{prompt.text}</h2>
            <div className="mt-4 space-y-4">
              {prompt.runs.length === 0 ? (
                <p className="text-sm text-muted">Not run yet.</p>
              ) : (
                prompt.runs.map((run) => (
                  <article key={run.id} className="border-b border-line pb-4 last:border-0">
                    <div className="flex flex-wrap gap-2 text-xs text-muted">
                      <span>{run.status}</span>
                      <span>{run.provider}</span>
                      <span>{run.model}</span>
                      <span>sample {run.sampleIndex + 1}</span>
                      <span>{new Date(run.runAt).toLocaleString()}</span>
                    </div>
                    <details className="mt-2 rounded-md border border-line bg-panel p-3 text-xs text-muted">
                      <summary className="cursor-pointer font-medium text-ink">Internal debug</summary>
                      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <dt className="font-medium text-ink">Evaluation run</dt>
                          <dd>{run.evaluationRunId ?? "n/a"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-ink">Langfuse trace ID</dt>
                          <dd>{run.langfuseTraceId ?? "n/a"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-ink">Observation ID</dt>
                          <dd>{run.langfuseObservationId ?? "n/a"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-ink">Trace link</dt>
                          <dd>
                            {run.langfuseTraceUrl ? (
                              <a href={run.langfuseTraceUrl} className="text-accent underline">
                                Open trace
                              </a>
                            ) : (
                              "n/a"
                            )}
                          </dd>
                        </div>
                      </dl>
                    </details>
                    {run.error ? <p className="mt-2 text-sm text-red-700">{run.error}</p> : null}
                    {run.rawAnswer ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{run.rawAnswer}</p> : null}
                    {run.extractionResult ? (
                      <div className="mt-3 rounded-md bg-panel p-3 text-sm text-muted">
                        <p>
                          Target appears: {run.extractionResult.targetAppears ? "yes" : "no"} · rank{" "}
                          {run.extractionResult.targetRank ?? "unknown"} · {run.extractionResult.sentiment}
                        </p>
                        <p className="mt-1">
                          Mentions:{" "}
                          {run.extractionResult.mentionedBusinesses.map((mentioned) => mentioned.name).join(", ") ||
                            "none"}
                        </p>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
