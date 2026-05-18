export type MetricExtractionResult = {
  promptId: string;
  targetAppears: boolean;
  targetRank: number | null;
  reasons: string[];
  sources: string[];
  mentionedBusinesses: {
    name: string;
    rank: number | null;
  }[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function calculateGeoMetrics(input: {
  promptCount: number;
  results: MetricExtractionResult[];
  targetName?: string;
  competitorNames: string[];
}) {
  const completedCount = input.results.length;
  const mentioned = input.results.filter((result) => result.targetAppears);
  const ranks = mentioned
    .map((result) => result.targetRank)
    .filter((rank): rank is number => typeof rank === "number");
  const competitorSet = new Set(input.competitorNames.map(normalize));
  const competitorMentions = input.results.filter((result) =>
    result.mentionedBusinesses.some((mentionedBusiness) => competitorSet.has(normalize(mentionedBusiness.name)))
  );
  const targetName = input.targetName ? normalize(input.targetName) : null;
  const targetMentions = input.results.reduce(
    (sum, result) =>
      sum +
      result.mentionedBusinesses.filter((mentionedBusiness) =>
        targetName ? normalize(mentionedBusiness.name) === targetName : result.targetAppears
      ).length,
    0
  );
  const competitorMentionCount = input.results.reduce(
    (sum, result) =>
      sum +
      result.mentionedBusinesses.filter((mentionedBusiness) => competitorSet.has(normalize(mentionedBusiness.name)))
        .length,
    0
  );
  const totalCompetitiveMentions = targetMentions + competitorMentionCount;
  const recommendationMentions = input.results.filter(
    (result) => result.targetAppears && (result.reasons.length > 0 || result.targetRank !== null)
  );
  const positionScores = mentioned.map((result) => {
    if (!result.targetRank) {
      return 0.5;
    }

    return 1 / result.targetRank;
  });
  const uniqueSources = new Set(input.results.flatMap((result) => result.sources.map(normalize)).filter(Boolean));

  const competitorDisplacements = new Map<string, number>();
  for (const result of input.results) {
    if (result.targetAppears) {
      continue;
    }

    for (const mentionedBusiness of result.mentionedBusinesses) {
      const name = normalize(mentionedBusiness.name);
      if (!competitorSet.has(name)) {
        continue;
      }

      competitorDisplacements.set(mentionedBusiness.name, (competitorDisplacements.get(mentionedBusiness.name) ?? 0) + 1);
    }
  }
  const topCompetitorDisplacement =
    Array.from(competitorDisplacements.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const byPrompt = new Map<string, MetricExtractionResult[]>();
  for (const result of input.results) {
    byPrompt.set(result.promptId, [...(byPrompt.get(result.promptId) ?? []), result]);
  }

  const promptConsistencyRates = Array.from(byPrompt.values()).map((results) => {
    const appearances = results.filter((result) => result.targetAppears).length;
    return results.length > 0 ? appearances / results.length : 0;
  });
  const volatilityRates = promptConsistencyRates.map((rate) => 2 * rate * (1 - rate));
  const volatilityScore =
    volatilityRates.length > 0
      ? Math.round((volatilityRates.reduce((sum, rate) => sum + rate, 0) / volatilityRates.length) * 100)
      : 0;
  const sampleCoverage = input.promptCount > 0 ? Math.min(1, completedCount / input.promptCount) : 0;
  const reliabilityScore = Math.round(sampleCoverage * (1 - volatilityScore / 100) * 100);
  const reliabilityLabel = reliabilityScore >= 75 ? "high" : reliabilityScore >= 45 ? "medium" : "low";

  return {
    visibilityRate: input.promptCount > 0 ? Math.round((mentioned.length / input.promptCount) * 100) : 0,
    recommendationRate:
      input.promptCount > 0 ? Math.round((recommendationMentions.length / input.promptCount) * 100) : 0,
    shareOfVoice:
      totalCompetitiveMentions > 0 ? Math.round((targetMentions / totalCompetitiveMentions) * 100) : 0,
    positionWeightedVisibility:
      input.promptCount > 0
        ? Math.round((positionScores.reduce((sum, score) => sum + score, 0) / input.promptCount) * 100)
        : 0,
    averageObservedPosition: ranks.length > 0 ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length : null,
    competitorShareOfRecommendations:
      completedCount > 0 ? Math.round((competitorMentions.length / completedCount) * 100) : 0,
    recommendationConsistency:
      promptConsistencyRates.length > 0
        ? Math.round(
            (promptConsistencyRates.reduce((sum, rate) => sum + rate, 0) / promptConsistencyRates.length) * 100
          )
        : 0,
    volatilityScore,
    sourceMentions: input.results.reduce((sum, result) => sum + result.sources.length, 0),
    sourceDiversity: uniqueSources.size,
    reliabilityScore,
    reliabilityLabel,
    topCompetitorDisplacement
  };
}
