import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardActions } from "@/components/dashboard-actions";
import { getBusinessDashboard } from "@/lib/dashboard";
import { ProgressBar, InfoIcon, Badge } from "@/components/ui-extras";
import { WhitelabelForm } from "@/components/whitelabel-form";
import { SnapshotChart } from "@/components/snapshot-chart";

const MIN_PROVIDER_RUNS = 10;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function formatRank(rank: number | null) {
  return rank ? rank.toFixed(1) : "n/a";
}

export default async function BusinessDashboardPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const isManageMode = query.manage !== undefined;
  const dashboard = await getBusinessDashboard(id);

  if (!dashboard) {
    notFound();
  }

  const snapshotAgeDays = dashboard.totals.snapshotCreatedAt
    ? Math.floor((Date.now() - new Date(dashboard.totals.snapshotCreatedAt).getTime()) / 86_400_000)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="accent" className="mb-2">
            Visibility Report
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            {dashboard.business.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {dashboard.business.category} in {dashboard.business.location}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
            This report evaluates how your business is recommended by AI search
            engines. We use a proprietary sampling methodology to measure
            consistency, competitive pressure, and brand share across dozens of
            local-intent scenarios.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <a
                href={`/api/businesses/${dashboard.business.id}/report.pdf`}
                download
                className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Download PDF
              </a>
              <Link
                href={`/businesses/${dashboard.business.id}/runs`}
                className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-panel"
              >
                Source Data
              </Link>
            </div>
            {isManageMode && (
              <details className="text-right">
                <summary className="cursor-pointer text-[10px] text-muted hover:text-ink transition-colors">
                  White-label for agency →
                </summary>
                <WhitelabelForm businessId={dashboard.business.id} />
              </details>
            )}
          </div>
          {snapshotAgeDays !== null && (
            <p className={`text-xs ${snapshotAgeDays > 14 ? "text-amber-600" : "text-muted"}`}>
              Last updated{" "}
              {snapshotAgeDays === 0
                ? "today"
                : snapshotAgeDays === 1
                  ? "yesterday"
                  : `${snapshotAgeDays} days ago`}
              {snapshotAgeDays > 14 ? " · consider re-running" : ""}
            </p>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <div className="flex items-center">
              <p className="text-sm font-medium text-muted">
                AI visibility opportunity
              </p>
              <InfoIcon title="Frequency of appearance across all sampled prompts." />
            </div>
            <p className="mt-2 text-4xl font-semibold text-ink">
              {dashboard.totals.visibilityScore}%
            </p>
            <ProgressBar
              value={dashboard.totals.visibilityScore}
              className="mt-4"
            />
            <p className="mt-4 text-xs leading-5 text-muted">
              Target appeared in{" "}
              <span className="font-medium text-ink">
                {dashboard.totals.completedRunCount}
              </span>{" "}
              completed samples across{" "}
              <span className="font-medium text-ink">
                {dashboard.totals.promptCount}
              </span>{" "}
              diversified prompts.
            </p>
          </div>
          <div>
            <div className="flex items-center">
              <p className="text-sm font-medium text-muted">
                Competitive share of voice
              </p>
              <InfoIcon title="The percentage of all business mentions that belong to this business." />
            </div>
            <p className="mt-2 text-4xl font-semibold text-ink">
              {dashboard.totals.shareOfVoice}%
            </p>
            <ProgressBar
              value={dashboard.totals.shareOfVoice}
              className="mt-4"
            />
            <p className="mt-4 text-xs leading-5 text-muted">
              Share of all target-plus-competitor mentions captured in{" "}
              <span className="font-medium text-ink">
                {dashboard.totals.completedRunCount}
              </span>{" "}
              sampled recommendations.
            </p>
          </div>
          <div>
            <div className="flex items-center">
              <p className="text-sm font-medium text-muted">Reliability</p>
              <InfoIcon title="Measure of consistency and sample coverage." />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-4xl font-semibold capitalize text-ink">
                {dashboard.totals.reliabilityLabel}
              </p>
              <p className="text-sm font-medium text-muted">
                ({dashboard.totals.reliabilityScore}%)
              </p>
            </div>
            <ProgressBar
              value={dashboard.totals.reliabilityScore}
              className="mt-4"
            />
            <p className="mt-4 text-xs leading-5 text-muted">
              Confidence score derived from sample coverage and answer
              volatility across{" "}
              <span className="font-medium text-ink">
                {dashboard.totals.completedRunCount}
              </span>{" "}
              runs.
            </p>
          </div>
        </div>
      </section>

      <SnapshotChart history={dashboard.snapshotHistory} />

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {(
          [
            {
              label: "Recommendation rate",
              value: `${dashboard.totals.recommendationRate}%`,
              info: "Percentage of prompts where the target was specifically recommended.",
              note: `n=${dashboard.totals.completedRunCount}`,
            },
            {
              label: "Position-weighted visibility",
              value: `${dashboard.totals.positionWeightedVisibility}%`,
              info: "Score adjusted for the rank position of the target.",
              note: `n=${dashboard.totals.completedRunCount}`,
            },
            {
              label: "Average observed position",
              value: formatRank(dashboard.totals.averageRank),
              info: "Mean rank when the target appears in recommendations.",
              note: null,
            },
            {
              label: "Consistency",
              value: `${dashboard.totals.recommendationConsistency}%`,
              info: "How often the target appears in the same position across similar prompts.",
              note: `n=${dashboard.totals.completedRunCount}`,
            },
            {
              label: "Volatility",
              value: `${dashboard.totals.volatilityScore}%`,
              info: "Measure of how much recommendations change across runs.",
              note: `n=${dashboard.totals.completedRunCount}`,
            },
            {
              label: "Competitor share",
              value: `${dashboard.totals.competitorShare}%`,
              info: "Percentage of mentions belonging to direct competitors.",
              note: `n=${dashboard.totals.completedRunCount}`,
            },
            {
              label: "Source diversity",
              value: String(dashboard.totals.sourceDiversity),
              info: "Number of unique domains/sources cited by the AI.",
              note: null,
            },
            {
              label: "Source mentions",
              value: String(dashboard.totals.sourceMentions),
              info: "Total count of external citations found in answers.",
              note: null,
            },
          ] as const
        ).map(({ label, value, info, note }) => (
          <div
            key={label}
            className="rounded-lg border border-line bg-white p-5 shadow-sm"
          >
            <div className="flex items-center">
              <p className="text-sm font-medium text-muted">{label}</p>
              <InfoIcon title={info} />
            </div>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
            {note ? (
              <p className="mt-1 text-[10px] text-muted">{note}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          [
            "Top displacement competitor",
            dashboard.totals.topCompetitorDisplacement ?? "none detected",
          ],
          ["Prompts", String(dashboard.totals.promptCount)],
          ["Completed runs", String(dashboard.totals.completedRunCount)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-line bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {isManageMode && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <DashboardActions
            businessId={dashboard.business.id}
            monitoringEnabled={dashboard.monitoring.enabled}
            monitoringIntervalDays={dashboard.monitoring.intervalDays}
            alertEmail={dashboard.monitoring.alertEmail ?? null}
          />

          <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Monitoring status</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                dashboard.monitoring.enabled
                  ? "bg-green-50 text-green-700"
                  : "bg-panel text-muted"
              }`}>
                {dashboard.monitoring.enabled ? "Active" : "Off"}
              </span>
            </div>
            {dashboard.monitoring.enabled ? (
              <div className="mt-3 space-y-1 text-xs text-muted">
                <p>Interval: every {dashboard.monitoring.intervalDays} {dashboard.monitoring.intervalDays === 1 ? "day" : "days"}</p>
                {dashboard.monitoring.lastMonitoredAt && (
                  <p>Last run: {new Date(dashboard.monitoring.lastMonitoredAt).toLocaleDateString()}</p>
                )}
                {dashboard.monitoring.nextRunAt && (
                  <p>Next run: {new Date(dashboard.monitoring.nextRunAt).toLocaleDateString()}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">Enable monitoring above to automatically track visibility changes over time.</p>
            )}

            {dashboard.monitoring.recentAlerts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-ink">Recent alerts</p>
                <div className="mt-2 space-y-2">
                  {dashboard.monitoring.recentAlerts.map((alert) => (
                    <div key={alert.id} className={`rounded-md border p-2 text-xs ${
                      alert.direction === "dropped"
                        ? "border-red-100 bg-red-50 text-red-700"
                        : "border-green-100 bg-green-50 text-green-700"
                    }`}>
                      <span className="font-semibold capitalize">{alert.direction}</span>
                      {" "}by {Math.abs(alert.delta)} points
                      {" "}({alert.previousScore}% → {alert.newScore}%)
                      <span className="ml-2 text-[10px] opacity-70">{alert.provider} · {new Date(alert.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dashboard.monitoring.recentAlerts.length === 0 && dashboard.monitoring.enabled && (
              <p className="mt-4 text-xs text-muted">No alerts yet. You will be notified here when visibility changes by 10+ points.</p>
            )}
          </div>
        </div>
      )}

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-accent">
              Methodology basis
            </p>
            <h2 className="mt-2 font-semibold text-ink">
              Diversified local-intent sampling
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              We evaluate AI visibility using repeated AI recommendation
              sampling across diversified local-intent prompts. Because AI
              answers vary, we report recommendation frequency and consistency
              rather than a single fixed ranking.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              The prompt set is grouped by buyer intent, evidence-seeking
              behaviour, competitor comparison, review sensitivity,
              availability, and location specificity. We show the coverage model
              and rationale here, while keeping the full prompt bank private to
              protect test integrity.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-line bg-panel p-3">
                <p className="text-xs text-muted">Prompt variants</p>
                <p className="mt-1 text-2xl font-semibold text-ink">
                  {dashboard.methodology.promptCount}
                </p>
              </div>
              <div className="rounded-md border border-line bg-panel p-3">
                <p className="text-xs text-muted">Intent groups</p>
                <p className="mt-1 text-2xl font-semibold text-ink">
                  {dashboard.methodology.clusterCount}
                </p>
              </div>
              <div className="rounded-md border border-line bg-panel p-3">
                <p className="text-xs text-muted">Providers</p>
                <p className="mt-1 text-2xl font-semibold text-ink">
                  {dashboard.providerBreakdown.length || 1}
                </p>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">
              Coverage shown, prompt bank private
            </h3>
            <a
              href={`/api/businesses/${dashboard.business.id}/prompts.csv`}
              download
              className="text-xs text-accent hover:underline"
            >
              Download prompt list (CSV)
            </a>
          </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {dashboard.methodology.intentCoverage.map((item) => (
                <span
                  key={item.label}
                  className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink"
                >
                  {item.label} · {item.count}
                </span>
              ))}
            </div>
            <h3 className="mt-5 text-sm font-semibold text-ink">
              External references
            </h3>
            <div className="mt-3 space-y-3">
              {dashboard.methodology.references.map((reference) => (
                <div
                  key={reference.url}
                  className="border-b border-line pb-3 last:border-0"
                >
                  <a
                    className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                    href={reference.url}
                  >
                    {reference.label}
                  </a>
                  <p className="mt-1 text-xs font-medium text-ink">
                    {reference.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {reference.reason}
                  </p>
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
                    Run prompts to compare ChatGPT, Gemini, and Google AI
                    Overview.
                  </td>
                </tr>
              ) : (
                dashboard.providerBreakdown.map((row) => (
                  <tr
                    key={row.provider}
                    className="border-b border-line last:border-0 hover:bg-panel/50"
                  >
                    <td className="py-3 font-semibold text-ink">{row.label}</td>
                    <td className="py-3 text-muted">{row.completedRunCount}</td>
                    {row.completedRunCount < MIN_PROVIDER_RUNS ? (
                      <td colSpan={5} className="py-3 text-xs text-amber-600">
                        Insufficient data — need at least {MIN_PROVIDER_RUNS} runs for reliable metrics
                      </td>
                    ) : (
                      <>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 font-medium text-ink">
                              {row.visibilityScore}%
                            </span>
                            <ProgressBar
                              value={row.visibilityScore}
                              className="w-16"
                            />
                          </div>
                        </td>
                        <td className="py-3 text-muted">
                          {row.recommendationRate}%
                        </td>
                        <td className="py-3 text-muted">{row.shareOfVoice}%</td>
                        <td className="py-3 text-muted">
                          {formatRank(row.averageRank)}
                        </td>
                        <td className="py-3 text-muted">{row.consistency}%</td>
                      </>
                    )}
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
          Each row uses the same local-intent prompt so provider differences are
          easier to review. The report shows intent coverage instead of
          publishing the full prompt text.
        </p>
        <div className="mt-4 space-y-5">
          {dashboard.promptProviderComparisons.length === 0 ? (
            <p className="text-sm text-muted">
              Run prompts across providers to compare answers side by side.
            </p>
          ) : (
            dashboard.promptProviderComparisons
              .slice(0, 4)
              .map((row, index) => (
                <div
                  key={row.promptId}
                  className="border-b border-line pb-5 last:border-0"
                >
                  <p className="text-sm font-medium text-ink">
                    Prompt sample {index + 1}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Intent: {row.promptSamplingIntent} · Cluster:{" "}
                    {row.promptClusterIntent}
                  </p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {row.providers.map((result) => (
                      <article
                        key={result.runId}
                        className="rounded-md border border-line bg-panel p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">
                            {result.provider.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs text-muted">
                            {result.targetAppears
                              ? `Target appears · rank ${result.targetRank ?? "unknown"}`
                              : "Target missing"}
                          </p>
                        </div>
                        <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted">
                          {result.rawAnswer}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          Mentions:{" "}
                          {result.mentionedBusinesses
                            .map((mentioned) => mentioned.name)
                            .slice(0, 5)
                            .join(", ") || "none"}
                        </p>
                        {result.referenceSignals.length > 0 ? (
                          <p className="mt-1 text-xs text-muted">
                            Signals:{" "}
                            {result.referenceSignals
                              .map((signal) => signal.label)
                              .slice(0, 4)
                              .join(", ")}
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
          <h2 className="font-semibold text-ink">
            Top prompts where target appears
          </h2>
          <div className="mt-4 space-y-3">
            {dashboard.topAppearingPrompts.length === 0 ? (
              <p className="text-sm text-muted">
                No completed prompt currently mentions the target business.
              </p>
            ) : (
              dashboard.topAppearingPrompts.map((result) => (
                <div
                  key={result.runId}
                  className="border-b border-line pb-3 last:border-0"
                >
                  <p className="text-sm font-medium text-ink">
                    {result.promptSamplingIntent}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Cluster {result.promptClusterIntent} · rank{" "}
                    {result.targetRank ?? "unknown"} · {result.sentiment} ·
                    confidence {result.confidence}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">
            Competitors appear, target missing
          </h2>
          {dashboard.competitorGapReasons.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Why competitors are chosen instead</p>
              <ul className="mt-2 space-y-1">
                {dashboard.competitorGapReasons.map(({ reason, count }) => (
                  <li key={reason} className="flex items-start gap-2 text-xs text-amber-700">
                    <span className="mt-0.5 shrink-0 font-bold">{count}×</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 space-y-3">
            {dashboard.competitorOnlyPrompts.length === 0 ? (
              <p className="text-sm text-muted">
                No competitor-only gaps found in latest completed runs.
              </p>
            ) : (
              dashboard.competitorOnlyPrompts.map((result) => (
                <div
                  key={result.runId}
                  className="border-b border-line pb-3 last:border-0"
                >
                  <p className="text-sm font-medium text-ink">
                    {result.promptSamplingIntent}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Cluster {result.promptClusterIntent} · mentions:{" "}
                    {result.mentionedBusinesses
                      .map((mentioned) => mentioned.name)
                      .join(", ")}
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
                <tr
                  key={row.name}
                  className="border-b border-line last:border-0 hover:bg-panel/50"
                >
                  <td className="py-3 font-semibold text-ink">
                    {row.name}{" "}
                    {row.isTarget ? (
                      <Badge variant="accent">target</Badge>
                    ) : null}
                  </td>
                  <td className="py-3 text-muted">{row.appearances}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 font-medium text-ink">
                        {row.share}%
                      </span>
                      <ProgressBar value={row.share} className="w-16" />
                    </div>
                  </td>
                  <td className="py-3 text-muted">
                    {formatRank(row.averageRank)}
                  </td>
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
                <span
                  key={attribute.label}
                  className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink"
                >
                  {attribute.label} · {attribute.count}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-ink">
              Reference signals mentioned
            </h2>
            <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              AI-cited · unverified
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Sources cited by the AI in its answers. Not independently confirmed — treat as signals to investigate, not facts.
          </p>
          <div className="mt-4 space-y-3">
            {dashboard.referenceSignals.length === 0 ? (
              <p className="text-sm text-muted">
                No reference signals extracted yet.
              </p>
            ) : (
              dashboard.referenceSignals.slice(0, 8).map((signal) => (
                <div
                  key={`${signal.sourceType}-${signal.label}`}
                  className="border-b border-line pb-3 last:border-0"
                >
                  <p className="text-sm font-medium text-ink">
                    {signal.label} · {signal.count}×
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {signal.sourceType.replaceAll("_", " ")}
                    {signal.url ? (
                      <> · <a href={signal.url} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">{signal.url}</a></>
                    ) : " · no URL"}
                  </p>
                  {signal.evidence ? (
                    <p className="mt-2 text-xs leading-5 text-muted italic">
                      &ldquo;{signal.evidence}&rdquo;
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Latest answer excerpts</h2>
        <div className="mt-4 space-y-4">
          {dashboard.latestResults.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-panel/30 p-8 text-center">
              <p className="text-sm text-muted">No audit runs completed yet.</p>
              <p className="mt-1 text-xs text-muted">
                Use the "Run verification" panel to start sampling AI answers.
              </p>
            </div>
          ) : (
            dashboard.latestResults.slice(0, 3).map((result, index) => (
              <article
                key={result.runId}
                className="border-b border-line pb-4 last:border-0"
              >
                <h3 className="text-sm font-medium text-ink">
                  Sample {index + 1}: {result.promptSamplingIntent}
                </h3>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted">
                  {result.rawAnswer}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge>{result.provider}</Badge>
                  <span className="text-[10px] text-muted uppercase tracking-wider">
                    {result.model}
                  </span>
                  <span className="text-[10px] text-muted">·</span>
                  <span className="text-[10px] text-muted">
                    {new Date(result.runAt).toLocaleString()}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Prompt coverage</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            The live report shows the audited intent groups and execution status
            without exposing the full prompt bank.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {dashboard.methodology.promptCoverage.map((prompt) => (
              <span
                key={prompt.label}
                className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink"
              >
                {prompt.label} · {prompt.count}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {dashboard.promptStatuses.slice(0, 8).map((prompt) => (
              <div
                key={prompt.id}
                className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0"
              >
                <p className="text-sm text-ink">{prompt.samplingIntent}</p>
                <Badge
                  variant={
                    prompt.latestRunStatus === "COMPLETED"
                      ? "accent"
                      : "default"
                  }
                >
                  {prompt.latestRunStatus || "pending"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
