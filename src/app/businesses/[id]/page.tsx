import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardActions } from "@/components/dashboard-actions";
import { getBusinessDashboard } from "@/lib/dashboard";

type Props = {
  params: Promise<{ id: string }>;
};

function formatRank(rank: number | null) {
  return rank ? rank.toFixed(1) : "n/a";
}

export default async function BusinessDashboardPage({ params }: Props) {
  const { id } = await params;
  const dashboard = await getBusinessDashboard(id);

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-accent">Client audit</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{dashboard.business.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {dashboard.business.category} in {dashboard.business.location}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
            We evaluate AI visibility using repeated recommendation sampling across diversified local-intent
            prompts. Because AI answers vary, we report recommendation frequency, share of voice, consistency, and
            competitive pressure rather than a single fixed ranking.
          </p>
        </div>
        <Link href={`/businesses/${dashboard.business.id}/runs`} className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-medium">
          Raw runs
        </Link>
      </div>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr]">
          <div>
            <p className="text-sm text-muted">AI visibility opportunity</p>
            <p className="mt-2 text-4xl font-semibold text-ink">{dashboard.totals.visibilityScore}%</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Target appeared in {dashboard.totals.completedRunCount} completed samples across{" "}
              {dashboard.totals.promptCount} diversified prompts.
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Competitive share of voice</p>
            <p className="mt-2 text-4xl font-semibold text-ink">{dashboard.totals.shareOfVoice}%</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Share of all target-plus-competitor mentions captured in the sampled recommendations.
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Reliability</p>
            <p className="mt-2 text-4xl font-semibold capitalize text-ink">{dashboard.totals.reliabilityLabel}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {dashboard.totals.reliabilityScore}% confidence from sample coverage and answer volatility.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Recommendation rate", `${dashboard.totals.recommendationRate}%`],
          ["Position-weighted visibility", `${dashboard.totals.positionWeightedVisibility}%`],
          ["Average observed position", formatRank(dashboard.totals.averageRank)],
          ["Consistency", `${dashboard.totals.recommendationConsistency}%`],
          ["Volatility", `${dashboard.totals.volatilityScore}%`],
          ["Competitor share", `${dashboard.totals.competitorShare}%`],
          ["Source diversity", String(dashboard.totals.sourceDiversity)],
          ["Source mentions", String(dashboard.totals.sourceMentions)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          ["Top displacement competitor", dashboard.totals.topCompetitorDisplacement ?? "none detected"],
          ["Prompts", String(dashboard.totals.promptCount)],
          ["Completed runs", String(dashboard.totals.completedRunCount)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <DashboardActions businessId={dashboard.business.id} />
      </div>

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-accent">Methodology basis</p>
            <h2 className="mt-2 font-semibold text-ink">Diversified local-intent sampling</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              We evaluate AI visibility using repeated AI recommendation sampling across diversified local-intent
              prompts. Because AI answers vary, we report recommendation frequency and consistency rather than a
              single fixed ranking.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              The prompt set is grouped by buyer intent, evidence-seeking behaviour, competitor comparison, review
              sensitivity, availability, and location specificity. We show the coverage model and rationale here, while
              keeping the full prompt bank private to protect test integrity.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-line bg-panel p-3">
                <p className="text-xs text-muted">Prompt variants</p>
                <p className="mt-1 text-2xl font-semibold text-ink">{dashboard.methodology.promptCount}</p>
              </div>
              <div className="rounded-md border border-line bg-panel p-3">
                <p className="text-xs text-muted">Intent groups</p>
                <p className="mt-1 text-2xl font-semibold text-ink">{dashboard.methodology.clusterCount}</p>
              </div>
              <div className="rounded-md border border-line bg-panel p-3">
                <p className="text-xs text-muted">Providers</p>
                <p className="mt-1 text-2xl font-semibold text-ink">{dashboard.providerBreakdown.length || 1}</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Coverage shown, prompt bank private</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {dashboard.methodology.intentCoverage.map((item) => (
                <span key={item.label} className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink">
                  {item.label} · {item.count}
                </span>
              ))}
            </div>
            <h3 className="mt-5 text-sm font-semibold text-ink">External references</h3>
            <div className="mt-3 space-y-3">
              {dashboard.methodology.references.map((reference) => (
                <div key={reference.url} className="border-b border-line pb-3 last:border-0">
                  <a className="text-sm font-medium text-accent underline-offset-4 hover:underline" href={reference.url}>
                    {reference.label}
                  </a>
                  <p className="mt-1 text-xs font-medium text-ink">{reference.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{reference.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Provider comparison</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="py-2 font-medium">Provider</th>
                <th className="py-2 font-medium">Runs</th>
                <th className="py-2 font-medium">Visibility</th>
                <th className="py-2 font-medium">Recommendation</th>
                <th className="py-2 font-medium">Share of voice</th>
                <th className="py-2 font-medium">Avg position</th>
                <th className="py-2 font-medium">Consistency</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.providerBreakdown.length === 0 ? (
                <tr>
                  <td className="py-3 text-muted" colSpan={7}>
                    Run prompts to compare ChatGPT, Gemini, and Google AI Overview.
                  </td>
                </tr>
              ) : (
                dashboard.providerBreakdown.map((row) => (
                  <tr key={row.provider} className="border-b border-line last:border-0">
                    <td className="py-3 font-medium text-ink">{row.label}</td>
                    <td className="py-3 text-muted">{row.completedRunCount}</td>
                    <td className="py-3 text-muted">{row.visibilityScore}%</td>
                    <td className="py-3 text-muted">{row.recommendationRate}%</td>
                    <td className="py-3 text-muted">{row.shareOfVoice}%</td>
                    <td className="py-3 text-muted">{formatRank(row.averageRank)}</td>
                    <td className="py-3 text-muted">{row.consistency}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Same-prompt provider results</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Each row uses the same local-intent prompt so provider differences are easier to review. The report shows
          intent coverage instead of publishing the full prompt text.
        </p>
        <div className="mt-4 space-y-5">
          {dashboard.promptProviderComparisons.length === 0 ? (
            <p className="text-sm text-muted">Run prompts across providers to compare answers side by side.</p>
          ) : (
            dashboard.promptProviderComparisons.slice(0, 4).map((row, index) => (
              <div key={row.promptId} className="border-b border-line pb-5 last:border-0">
                <p className="text-sm font-medium text-ink">Prompt sample {index + 1}</p>
                <p className="mt-1 text-xs text-muted">
                  Intent: {row.promptSamplingIntent} · Cluster: {row.promptClusterIntent}
                </p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {row.providers.map((result) => (
                    <article key={result.runId} className="rounded-md border border-line bg-panel p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{result.provider.replaceAll("_", " ")}</p>
                        <p className="text-xs text-muted">
                          {result.targetAppears ? `Target appears · rank ${result.targetRank ?? "unknown"}` : "Target missing"}
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted">{result.rawAnswer}</p>
                      <p className="mt-2 text-xs text-muted">
                        Mentions: {result.mentionedBusinesses.map((mentioned) => mentioned.name).slice(0, 5).join(", ") || "none"}
                      </p>
                      {result.referenceSignals.length > 0 ? (
                        <p className="mt-1 text-xs text-muted">
                          Signals: {result.referenceSignals.map((signal) => signal.label).slice(0, 4).join(", ")}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Top prompts where target appears</h2>
          <div className="mt-4 space-y-3">
            {dashboard.topAppearingPrompts.length === 0 ? (
              <p className="text-sm text-muted">No completed prompt currently mentions the target business.</p>
            ) : (
              dashboard.topAppearingPrompts.map((result) => (
                <div key={result.runId} className="border-b border-line pb-3 last:border-0">
                  <p className="text-sm font-medium text-ink">{result.promptSamplingIntent}</p>
                  <p className="mt-1 text-xs text-muted">
                    Cluster {result.promptClusterIntent} · rank {result.targetRank ?? "unknown"} · {result.sentiment} ·
                    confidence {result.confidence}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Competitors appear, target missing</h2>
          <div className="mt-4 space-y-3">
            {dashboard.competitorOnlyPrompts.length === 0 ? (
              <p className="text-sm text-muted">No competitor-only gaps found in latest completed runs.</p>
            ) : (
              dashboard.competitorOnlyPrompts.map((result) => (
                <div key={result.runId} className="border-b border-line pb-3 last:border-0">
                  <p className="text-sm font-medium text-ink">{result.promptSamplingIntent}</p>
                  <p className="mt-1 text-xs text-muted">
                    Cluster {result.promptClusterIntent} · mentions:{" "}
                    {result.mentionedBusinesses.map((mentioned) => mentioned.name).join(", ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Competitor comparison</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="py-2 font-medium">Business</th>
                <th className="py-2 font-medium">Appears</th>
                <th className="py-2 font-medium">Share</th>
                <th className="py-2 font-medium">Average rank</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.comparison.map((row) => (
                <tr key={row.name} className="border-b border-line last:border-0">
                  <td className="py-3 font-medium text-ink">
                    {row.name} {row.isTarget ? <span className="text-xs text-accent">(target)</span> : null}
                  </td>
                  <td className="py-3 text-muted">{row.appearances}</td>
                  <td className="py-3 text-muted">{row.share}%</td>
                  <td className="py-3 text-muted">{formatRank(row.averageRank)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Semantic attributes</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {dashboard.semanticAttributes.length === 0 ? (
              <p className="text-sm text-muted">No attributes extracted yet.</p>
            ) : (
              dashboard.semanticAttributes.map((attribute) => (
                <span key={attribute.label} className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink">
                  {attribute.label} · {attribute.count}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Reference signals mentioned</h2>
          <div className="mt-4 space-y-3">
            {dashboard.referenceSignals.length === 0 ? (
              <p className="text-sm text-muted">No reference signals extracted yet.</p>
            ) : (
              dashboard.referenceSignals.slice(0, 8).map((signal) => (
                <div key={`${signal.sourceType}-${signal.label}`} className="border-b border-line pb-3 last:border-0">
                  <p className="text-sm font-medium text-ink">
                    {signal.label} · {signal.count}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {signal.sourceType.replaceAll("_", " ")}
                    {signal.url ? ` · ${signal.url}` : ""}
                  </p>
                  {signal.evidence ? <p className="mt-2 text-sm leading-6 text-muted">{signal.evidence}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Latest answer excerpts</h2>
        <div className="mt-4 space-y-4">
          {dashboard.latestResults.slice(0, 3).map((result, index) => (
            <article key={result.runId} className="border-b border-line pb-4 last:border-0">
              <h3 className="text-sm font-medium text-ink">Sample {index + 1}: {result.promptSamplingIntent}</h3>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted">{result.rawAnswer}</p>
              <p className="mt-2 text-xs text-muted">
                {result.provider} · {result.model} · {new Date(result.runAt).toLocaleString()}
              </p>
            </article>
          ))}
          {dashboard.latestResults.length === 0 ? <p className="text-sm text-muted">Run prompts to see answers.</p> : null}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Prompt coverage</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            The live report shows the audited intent groups and execution status without exposing the full prompt bank.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {dashboard.methodology.promptCoverage.map((prompt) => (
              <span key={prompt.label} className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink">
                {prompt.label} · {prompt.count}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {dashboard.promptStatuses.slice(0, 6).map((prompt) => (
              <div key={prompt.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                <p className="text-sm text-ink">{prompt.samplingIntent}</p>
                <p className="shrink-0 text-xs text-muted">{prompt.latestRunStatus}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
