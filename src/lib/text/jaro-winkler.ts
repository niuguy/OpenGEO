// Jaro-Winkler similarity, normalized in [0,1]. Hand-rolled (small, no
// runtime dependency). Used by the deterministic target-name match in the
// hardened spot check — replaces the LLM's "targetAppears" judgement.

export function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
}

export function jaroWinklerSimilarity(a: string, b: string, prefixScale = 0.1): number {
  const jaro = jaroSimilarity(a, b);
  let prefix = 0;
  const limit = Math.min(4, a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * prefixScale * (1 - jaro);
}

// Normalize for business-name matching: lowercase, collapse whitespace, strip
// punctuation, fold common UK/US variants (&→and, Practise→Practice, drop Ltd
// /Limited / Inc / LLC etc. that don't affect identity). Tuned by trial — see
// tests for the canonical edge cases.
const ENTITY_SUFFIXES = /\b(ltd|limited|llc|llp|plc|inc|incorporated|co\.?|company|corp\.?|corporation|gmbh|sa|nv)\b/g;
const COMMON_SWAPS: Array<[RegExp, string]> = [
  [/\bpractise\b/g, "practice"],
  [/&/g, "and"],
  [/\bdr\.?\b/g, "doctor"],
  [/\bst\.?\b/g, "street"]
];

export function normalizeBusinessName(value: string): string {
  let s = value.toLowerCase();
  // Drop apostrophes and curly quotes WITHOUT spacing so "Smith's" → "smiths".
  s = s.replace(/['‘’]/g, "");
  for (const [pat, repl] of COMMON_SWAPS) s = s.replace(pat, repl);
  s = s.replace(ENTITY_SUFFIXES, " ");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function targetNameMatches(
  candidates: { name: string }[],
  target: string,
  threshold = 0.85
): { matched: boolean; bestScore: number; bestCandidate: string | null } {
  const normTarget = normalizeBusinessName(target);
  if (!normTarget) return { matched: false, bestScore: 0, bestCandidate: null };

  let bestScore = 0;
  let bestCandidate: string | null = null;

  for (const candidate of candidates) {
    const normCand = normalizeBusinessName(candidate.name);
    if (!normCand) continue;
    const score = jaroWinklerSimilarity(normTarget, normCand);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate.name;
    }
  }

  return { matched: bestScore >= threshold, bestScore, bestCandidate };
}
