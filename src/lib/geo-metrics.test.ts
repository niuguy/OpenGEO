import { describe, expect, it } from "vitest";
import { calculateGeoMetrics } from "./geo-metrics";

describe("calculateGeoMetrics", () => {
  it("computes visibility metrics from application results", () => {
    const metrics = calculateGeoMetrics({
      promptCount: 2,
      competitorNames: ["Competitor Dental"],
      results: [
        {
          promptId: "prompt-1",
          targetAppears: true,
          targetRank: 2,
          reasons: ["listed as an option"],
          sources: ["https://example.com"],
          mentionedBusinesses: [{ name: "Example Dental Clinic", rank: 2 }]
        },
        {
          promptId: "prompt-1",
          targetAppears: false,
          targetRank: null,
          reasons: [],
          sources: [],
          mentionedBusinesses: [{ name: "Competitor Dental", rank: 1 }]
        },
        {
          promptId: "prompt-2",
          targetAppears: true,
          targetRank: 1,
          reasons: ["recommended first"],
          sources: ["https://example.com/a", "https://example.com/b"],
          mentionedBusinesses: [
            { name: "Example Dental Clinic", rank: 1 },
            { name: "Competitor Dental", rank: 2 }
          ]
        }
      ]
    });

    expect(metrics.visibilityRate).toBe(100);
    expect(metrics.recommendationRate).toBe(100);
    expect(metrics.shareOfVoice).toBe(60);
    expect(metrics.positionWeightedVisibility).toBe(75);
    expect(metrics.averageObservedPosition).toBe(1.5);
    expect(metrics.competitorShareOfRecommendations).toBe(67);
    expect(metrics.recommendationConsistency).toBe(75);
    expect(metrics.volatilityScore).toBe(25);
    expect(metrics.sourceMentions).toBe(3);
    expect(metrics.sourceDiversity).toBe(3);
    expect(metrics.reliabilityLabel).toBe("high");
    expect(metrics.topCompetitorDisplacement).toBe("Competitor Dental");
  });
});
