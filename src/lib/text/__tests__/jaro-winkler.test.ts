import { describe, expect, it } from "vitest";
import { jaroWinklerSimilarity, normalizeBusinessName, targetNameMatches } from "../jaro-winkler";

describe("jaroWinklerSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroWinklerSimilarity("smile dental", "smile dental")).toBe(1);
  });

  it("returns 0 for completely disjoint strings", () => {
    expect(jaroWinklerSimilarity("abc", "xyz")).toBe(0);
  });

  it("rewards shared prefix above plain Jaro", () => {
    // Same Jaro score but better prefix should win.
    const a = jaroWinklerSimilarity("martha", "marhta");
    expect(a).toBeGreaterThan(0.96);
  });
});

describe("normalizeBusinessName", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeBusinessName("  Smile  Dental  ")).toBe("smile dental");
  });

  it("drops trailing entity suffixes (Ltd, Limited, LLC, etc.)", () => {
    expect(normalizeBusinessName("Smith & Co Ltd")).toBe("smith and");
    expect(normalizeBusinessName("Acme LLC")).toBe("acme");
    expect(normalizeBusinessName("Foo Inc.")).toBe("foo");
  });

  it("folds & to and, Practise to Practice, Dr to Doctor", () => {
    expect(normalizeBusinessName("Dr. Smith's & Sons")).toBe("doctor smiths and sons");
    expect(normalizeBusinessName("UK Dental Practise")).toBe("uk dental practice");
  });
});

describe("targetNameMatches", () => {
  const target = "Smile Dental Practice";

  it("matches exact-equal candidate", () => {
    const result = targetNameMatches([{ name: "Smile Dental Practice" }], target);
    expect(result.matched).toBe(true);
    expect(result.bestScore).toBe(1);
    expect(result.bestCandidate).toBe("Smile Dental Practice");
  });

  it("matches across UK/US spelling difference (Practise vs Practice)", () => {
    const result = targetNameMatches([{ name: "Smile Dental Practise" }], target);
    expect(result.matched).toBe(true);
  });

  it("matches when entity suffix is added or removed", () => {
    const result = targetNameMatches([{ name: "Smile Dental Practice Ltd" }], target);
    expect(result.matched).toBe(true);
  });

  it("does NOT match a clearly different business that shares one word", () => {
    const result = targetNameMatches(
      [{ name: "Acme Dental Group" }, { name: "Foo Surgery" }],
      target
    );
    expect(result.matched).toBe(false);
  });

  it("returns the highest-scoring candidate when there are multiple matches", () => {
    const result = targetNameMatches(
      [
        { name: "Acme Dental" },
        { name: "Smile Dental Practice Ltd" },
        { name: "Foo Bar" }
      ],
      target
    );
    expect(result.matched).toBe(true);
    expect(result.bestCandidate).toBe("Smile Dental Practice Ltd");
  });

  it("handles empty candidate list and empty target", () => {
    expect(targetNameMatches([], target)).toEqual({ matched: false, bestScore: 0, bestCandidate: null });
    expect(targetNameMatches([{ name: "anything" }], "  ")).toEqual({
      matched: false,
      bestScore: 0,
      bestCandidate: null
    });
  });
});
