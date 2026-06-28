import { describe, expect, it } from "vitest";
import { applyStrategistEdits, type StrategistEdit } from "@/lib/prompts/strategist";
import type { GeneratedPrompt } from "@/lib/prompts/types";

function base(clusterId: string, text: string): GeneratedPrompt {
  return {
    text,
    template: text,
    clusterId,
    clusterIntent: `intent for ${clusterId}`,
    packId: "local-business",
    samplingBasis: { intent: "best-provider", wordingStyle: "search-like" }
  };
}

const emptyEdit: StrategistEdit = { drops: [], rephrasings: [], rationales: [], additions: [] };

describe("applyStrategistEdits", () => {
  const baseSet = [
    base("best-local-category", "best dentist in Woking"),
    base("same-day-availability", "where can I get a same-day dentist appointment in Woking?"),
    base("affordable-local-category", "affordable dentist recommendations in Woking")
  ];

  it("returns the base set unchanged for an empty edit", () => {
    const result = applyStrategistEdits(baseSet, emptyEdit, "local-business");
    expect(result.map((p) => p.text)).toEqual(baseSet.map((p) => p.text));
    expect(result.every((p) => p.rationale === null)).toBe(true);
  });

  it("drops clusters by id", () => {
    const result = applyStrategistEdits(baseSet, { ...emptyEdit, drops: ["same-day-availability"] }, "local-business");
    expect(result.map((p) => p.clusterId)).not.toContain("same-day-availability");
    expect(result).toHaveLength(2);
  });

  it("rephrases text but preserves cluster metadata", () => {
    const result = applyStrategistEdits(
      baseSet,
      { ...emptyEdit, rephrasings: [{ clusterId: "best-local-category", text: "top dentist in Woking, Surrey" }] },
      "local-business"
    );
    const target = result.find((p) => p.clusterId === "best-local-category");
    expect(target?.text).toBe("top dentist in Woking, Surrey");
    expect(target?.samplingBasis.intent).toBe("best-provider");
  });

  it("ignores a blank rephrasing and keeps the original text", () => {
    const result = applyStrategistEdits(
      baseSet,
      { ...emptyEdit, rephrasings: [{ clusterId: "best-local-category", text: "   " }] },
      "local-business"
    );
    expect(result.find((p) => p.clusterId === "best-local-category")?.text).toBe("best dentist in Woking");
  });

  it("attaches rationales by cluster id", () => {
    const result = applyStrategistEdits(
      baseSet,
      { ...emptyEdit, rationales: [{ clusterId: "affordable-local-category", rationale: "price-led patients" }] },
      "local-business"
    );
    expect(result.find((p) => p.clusterId === "affordable-local-category")?.rationale).toBe("price-led patients");
  });

  it("appends additions tagged with strategist origin", () => {
    const result = applyStrategistEdits(
      baseSet,
      {
        ...emptyEdit,
        additions: [
          {
            text: "best dentist in Woking for nervous patients",
            clusterIntent: "Anxiety-friendly recommendation",
            intent: "attribute-specific",
            wordingStyle: "search-like",
            rationale: "common patient concern"
          }
        ]
      },
      "local-business"
    );
    const added = result.find((p) => p.text === "best dentist in Woking for nervous patients");
    expect(added).toBeDefined();
    expect(added?.samplingBasis.origin).toBe("strategist");
    expect(added?.clusterId.startsWith("strategist-")).toBe(true);
    expect(added?.rationale).toBe("common patient concern");
  });

  it("caps additions at six", () => {
    const additions = Array.from({ length: 10 }, (_v, i) => ({
      text: `extra prompt number ${i}`,
      clusterIntent: "Extra",
      intent: "x",
      wordingStyle: "y",
      rationale: "z"
    }));
    const result = applyStrategistEdits([], { ...emptyEdit, additions }, "local-business");
    expect(result).toHaveLength(6);
  });

  it("deduplicates an addition that collides with a kept base prompt", () => {
    const result = applyStrategistEdits(
      baseSet,
      {
        ...emptyEdit,
        additions: [
          {
            text: "best dentist in Woking",
            clusterIntent: "dup",
            intent: "x",
            wordingStyle: "y",
            rationale: "z"
          }
        ]
      },
      "local-business"
    );
    expect(result.filter((p) => p.text === "best dentist in Woking")).toHaveLength(1);
  });
});
