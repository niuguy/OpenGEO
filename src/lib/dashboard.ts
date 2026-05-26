import type { Sentiment } from "@prisma/client";
import { providerLabel } from "./ai/providers";
import { calculateGeoMetrics } from "./geo-metrics";
import { prisma } from "./prisma";

type LatestResult = {
  promptId: string;
  promptText: string;
  promptClusterIntent: string;
  promptSamplingIntent: string;
  runId: string;
  provider: string;
  runAt: Date;
  model: string;
  rawAnswer: string | null;
  status: string;
  targetAppears: boolean;
  targetRank: number | null;
  sentiment: Sentiment;
  confidence: number;
  reasons: string[];
  mentionedBusinesses: {
    name: string;
    rank: number | null;
    sentiment: Sentiment;
    reasons: string[];
  }[];
  semanticAttributes: {
    label: string;
    evidence: string | null;
  }[];
  referenceSignals: {
    sourceType: string;
    label: string;
    url: string | null;
    evidence: string | null;
    mentionedForBusinesses: string[];
  }[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function countBy<T>(items: T[], labelFor: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = labelFor(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function samplingIntent(prompt: { samplingBasis: unknown; clusterIntent: string }) {
  if (prompt.samplingBasis && typeof prompt.samplingBasis === "object" && "intent" in prompt.samplingBasis) {
    const intent = (prompt.samplingBasis as { intent?: unknown }).intent;
    if (typeof intent === "string" && intent.trim()) {
      return intent;
    }
  }

  return prompt.clusterIntent;
}

export async function getBusinessDashboard(businessId: string) {
  const [business, recentAlerts, allSnapshots] = await Promise.all([
  prisma.business.findUnique({
    where: { id: businessId },
    include: {
      competitors: {
        orderBy: { name: "asc" }
      },
      prompts: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: {
          runs: {
            orderBy: { runAt: "desc" },
            take: 60,
            include: {
              extractionResult: {
                include: {
                  mentionedBusinesses: true,
                  referenceSignals: true,
                  semanticAttributes: true
                }
              }
            }
          }
        }
      },
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  }),
  prisma.telemetryEvent.findMany({
    where: {
      eventName: "visibility_alert",
      payload: { path: ["businessId"], equals: businessId }
    },
    orderBy: { createdAt: "desc" },
    take: 5
  }),
  prisma.visibilitySnapshot.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
    select: {
      provider: true,
      visibilityScore: true,
      shareOfVoice: true,
      recommendationRate: true,
      reliabilityScore: true,
      createdAt: true
    }
  })
  ]);

  if (!business) {
    return null;
  }

  const latestResults: LatestResult[] = business.prompts.flatMap((prompt) => {
    const latestRunsByProvider = new Map<string, (typeof prompt.runs)[number]>();
    for (const run of prompt.runs) {
      if (!run.extractionResult || latestRunsByProvider.has(run.provider)) {
        continue;
      }
      latestRunsByProvider.set(run.provider, run);
    }

    return Array.from(latestRunsByProvider.values()).map((run) => {
      const extraction = run.extractionResult!;
      return {
      promptId: prompt.id,
      promptText: prompt.text,
      promptClusterIntent: prompt.clusterIntent,
      promptSamplingIntent: samplingIntent(prompt),
      runId: run.id,
      provider: run.provider,
      runAt: run.runAt,
      model: run.model,
      rawAnswer: run.rawAnswer,
      status: run.status,
      targetAppears: extraction.targetAppears,
      targetRank: extraction.targetRank,
      sentiment: extraction.sentiment,
      confidence: extraction.confidence,
      reasons: extraction.reasons,
      mentionedBusinesses: extraction.mentionedBusinesses.map((mentioned) => ({
        name: mentioned.name,
        rank: mentioned.rank,
        sentiment: mentioned.sentiment,
        reasons: mentioned.reasons
      })),
      semanticAttributes: extraction.semanticAttributes.map((attribute) => ({
        label: attribute.label,
        evidence: attribute.evidence
      })),
      referenceSignals: extraction.referenceSignals.map((signal) => ({
        sourceType: signal.sourceType,
        label: signal.label,
        url: signal.url,
        evidence: signal.evidence,
        mentionedForBusinesses: signal.mentionedForBusinesses
      }))
    };
    });
  });

  const mentionedTarget = latestResults.filter((result) => result.targetAppears);
  const targetRanks = mentionedTarget
    .map((result) => result.targetRank)
    .filter((rank): rank is number => typeof rank === "number");

  const competitorNames = business.competitors.map((competitor) => competitor.name);
  const comparisonNames = [business.name, ...competitorNames];
  const comparison = comparisonNames.map((name) => {
    const normalized = normalize(name);
    const appearances = latestResults.filter((result) =>
      result.mentionedBusinesses.some((mentioned) => normalize(mentioned.name) === normalized)
    );
    const ranks = appearances
      .flatMap((result) =>
        result.mentionedBusinesses
          .filter((mentioned) => normalize(mentioned.name) === normalized)
          .map((mentioned) => mentioned.rank)
      )
      .filter((rank): rank is number => typeof rank === "number");

    return {
      name,
      isTarget: name === business.name,
      appearances: appearances.length,
      share: business.prompts.length > 0 ? Math.round((appearances.length / business.prompts.length) * 100) : 0,
      averageRank: ranks.length > 0 ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length : null
    };
  });

  const attributeCounts = new Map<string, { label: string; count: number; evidence: string | null }>();
  for (const result of latestResults) {
    for (const attribute of result.semanticAttributes) {
      const key = normalize(attribute.label);
      const current = attributeCounts.get(key);
      attributeCounts.set(key, {
        label: current?.label ?? attribute.label,
        count: (current?.count ?? 0) + 1,
        evidence: current?.evidence ?? attribute.evidence
      });
    }
  }

  const competitorOnlyPrompts = latestResults.filter((result) => {
    if (result.targetAppears) {
      return false;
    }

    return result.mentionedBusinesses.some((mentioned) =>
      competitorNames.some((competitor) => normalize(competitor) === normalize(mentioned.name))
    );
  });

  const gapReasonFrequency = new Map<string, number>();
  for (const result of competitorOnlyPrompts) {
    for (const mentioned of result.mentionedBusinesses) {
      if (competitorNames.some((c) => normalize(c) === normalize(mentioned.name))) {
        for (const reason of mentioned.reasons) {
          const trimmed = reason.trim();
          if (trimmed) {
            gapReasonFrequency.set(trimmed, (gapReasonFrequency.get(trimmed) ?? 0) + 1);
          }
        }
      }
    }
  }
  const competitorGapReasons = Array.from(gapReasonFrequency.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const providerBreakdown = Array.from(new Set(latestResults.map((result) => result.provider))).map((provider) => {
    const providerResults = latestResults.filter((result) => result.provider === provider);
    const metricInput = providerResults.map((result) => ({
      promptId: result.promptId,
      targetAppears: result.targetAppears,
      targetRank: result.targetRank,
      reasons: result.reasons,
      sources: result.referenceSignals.map((signal) => signal.url || signal.label),
      mentionedBusinesses: result.mentionedBusinesses
    }));
    const metrics = calculateGeoMetrics({
      promptCount: business.prompts.length,
      results: metricInput,
      targetName: business.name,
      competitorNames
    });
    const latestSnapshot = business.snapshots.find((snapshot) => snapshot.provider === provider);

    return {
      provider,
      label: providerLabel(provider),
      completedRunCount: providerResults.length,
      visibilityScore: latestSnapshot?.visibilityScore ?? metrics.visibilityRate,
      recommendationRate: latestSnapshot?.recommendationRate ?? metrics.recommendationRate,
      shareOfVoice: latestSnapshot?.shareOfVoice ?? metrics.shareOfVoice,
      averageRank: latestSnapshot?.averageRank ?? metrics.averageObservedPosition,
      consistency: latestSnapshot?.recommendationConsistency ?? metrics.recommendationConsistency,
      sourceDiversity: latestSnapshot?.sourceDiversity ?? metrics.sourceDiversity
    };
  });
  const primarySnapshot = business.snapshots.find((snapshot) => snapshot.provider === "chatgpt") ?? business.snapshots[0];

  const referenceSignalCounts = new Map<
    string,
    { sourceType: string; label: string; count: number; url: string | null; evidence: string | null }
  >();
  for (const result of latestResults) {
    for (const signal of result.referenceSignals) {
      const key = `${signal.sourceType}:${normalize(signal.label)}`;
      const current = referenceSignalCounts.get(key);
      referenceSignalCounts.set(key, {
        sourceType: current?.sourceType ?? signal.sourceType,
        label: current?.label ?? signal.label,
        count: (current?.count ?? 0) + 1,
        url: current?.url ?? signal.url,
        evidence: current?.evidence ?? signal.evidence
      });
    }
  }
  const resultsByPrompt = new Map<string, LatestResult[]>();
  for (const result of latestResults) {
    resultsByPrompt.set(result.promptId, [...(resultsByPrompt.get(result.promptId) ?? []), result]);
  }
  const providerOrder = ["chatgpt", "gemini", "google_ai_overview"];
  const promptProviderComparisons = business.prompts
    .map((prompt) => ({
      promptId: prompt.id,
      promptText: prompt.text,
      promptClusterIntent: prompt.clusterIntent,
      promptSamplingIntent: samplingIntent(prompt),
      providers: (resultsByPrompt.get(prompt.id) ?? []).sort(
        (a, b) => providerOrder.indexOf(a.provider) - providerOrder.indexOf(b.provider)
      )
    }))
    .filter((row) => row.providers.length > 0);
  const promptCoverage = countBy(business.prompts, (prompt) => prompt.clusterIntent);
  const intentCoverage = countBy(business.prompts, samplingIntent);
  const methodologyReferences = [
    {
      label: "Stanford HELM",
      title: "Holistic Evaluation of Language Models",
      url: "https://arxiv.org/abs/2211.09110",
      reason: "Supports multi-scenario, multi-metric language-model evaluation rather than relying on one fixed score."
    },
    {
      label: "Brittlebench",
      title: "Quantifying LLM robustness via prompt sensitivity",
      url: "https://arxiv.org/abs/2603.13285",
      reason: "Supports testing semantically related prompt variants because real user wording changes model behavior."
    },
    {
      label: "Google Search Quality Rater Guidelines",
      title: "General Guidelines for Search Quality Evaluators",
      url: "https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf",
      reason: "Supports using reputation, customer-review, website, and external reference signals when assessing local-business evidence."
    }
  ];

  const snapshotsByProvider = new Map<string, typeof allSnapshots>();
  for (const snap of allSnapshots) {
    const list = snapshotsByProvider.get(snap.provider) ?? [];
    list.push(snap);
    snapshotsByProvider.set(snap.provider, list);
  }
  const snapshotHistory = Array.from(snapshotsByProvider.entries()).map(([provider, snaps]) => {
    const byDay = new Map<string, (typeof snaps)[number]>();
    for (const s of snaps) {
      byDay.set(s.createdAt.toISOString().slice(0, 10), s);
    }
    return {
      provider,
      label: providerLabel(provider),
      points: Array.from(byDay.values()).map((s) => ({
        date: s.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        visibilityScore: Math.round(s.visibilityScore),
        shareOfVoice: Math.round(s.shareOfVoice),
        recommendationRate: Math.round(s.recommendationRate),
        reliabilityScore: Math.round(s.reliabilityScore)
      }))
    };
  });

  return {
    business,
    snapshotHistory,
    totals: {
      promptCount: business.prompts.length,
      completedRunCount: latestResults.length,
      visibilityScore:
        primarySnapshot?.visibilityScore ??
        (business.prompts.length > 0 ? Math.round((mentionedTarget.length / business.prompts.length) * 100) : 0),
      averageRank:
        primarySnapshot?.averageRank ??
        (targetRanks.length > 0 ? targetRanks.reduce((sum, rank) => sum + rank, 0) / targetRanks.length : null),
      recommendationRate: primarySnapshot?.recommendationRate ?? 0,
      shareOfVoice: primarySnapshot?.shareOfVoice ?? 0,
      positionWeightedVisibility: primarySnapshot?.positionWeightedVisibility ?? 0,
      recommendationConsistency: primarySnapshot?.recommendationConsistency ?? 0,
      competitorShare: primarySnapshot?.competitorShare ?? 0,
      volatilityScore: primarySnapshot?.volatilityScore ?? 0,
      sourceMentions: primarySnapshot?.sourceMentions ?? 0,
      sourceDiversity: primarySnapshot?.sourceDiversity ?? 0,
      reliabilityScore: primarySnapshot?.reliabilityScore ?? 0,
      reliabilityLabel: primarySnapshot?.reliabilityLabel ?? "low",
      topCompetitorDisplacement: primarySnapshot?.topCompetitorDisplacement ?? null,
      snapshotCreatedAt: primarySnapshot?.createdAt ?? null
    },
    providerBreakdown,
    topAppearingPrompts: mentionedTarget
      .sort((a, b) => (a.targetRank ?? 99) - (b.targetRank ?? 99))
      .slice(0, 8),
    competitorOnlyPrompts,
    competitorGapReasons,
    semanticAttributes: Array.from(attributeCounts.values()).sort((a, b) => b.count - a.count),
    referenceSignals: Array.from(referenceSignalCounts.values()).sort((a, b) => b.count - a.count),
    promptProviderComparisons,
    methodology: {
      promptCount: business.prompts.length,
      clusterCount: promptCoverage.length,
      promptCoverage: promptCoverage.slice(0, 10),
      intentCoverage: intentCoverage.slice(0, 10),
      references: methodologyReferences
    },
    monitoring: {
      enabled: business.monitoringEnabled,
      intervalDays: business.monitoringIntervalDays,
      alertEmail: business.alertEmail,
      lastMonitoredAt: business.lastMonitoredAt,
      nextRunAt: business.monitoringEnabled && business.lastMonitoredAt
        ? new Date(business.lastMonitoredAt.getTime() + business.monitoringIntervalDays * 86_400_000)
        : null,
      recentAlerts: recentAlerts.map((event) => {
        const props = event.payload as Record<string, unknown>;
        return {
          id: event.id,
          createdAt: event.createdAt,
          provider: String(props.provider ?? "chatgpt"),
          previousScore: Number(props.previousScore ?? 0),
          newScore: Number(props.newScore ?? 0),
          delta: Number(props.delta ?? 0),
          direction: String(props.direction ?? "dropped")
        };
      })
    },
    comparison,
    latestResults: latestResults.sort((a, b) => b.runAt.getTime() - a.runAt.getTime()),
    promptStatuses: business.prompts.map((prompt) => ({
      id: prompt.id,
      text: prompt.text,
      clusterIntent: prompt.clusterIntent,
      samplingIntent: samplingIntent(prompt),
      latestRunStatus: prompt.runs[0]?.status ?? "NOT_RUN",
      latestRunAt: prompt.runs[0]?.runAt ?? null
    }))
  };
}
