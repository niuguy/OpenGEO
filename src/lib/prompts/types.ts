// Core prompt-pack types. Packs are deterministic template generators: pure
// functions of PromptPackInput, reproducible byte-for-byte. Non-local packs
// define their own samplingBasis vocabulary (e.g. buyer stage instead of
// locationStyle), but `intent` and `wordingStyle` stay required so the
// stratified-sampling audit trail holds across packs.

export type SamplingBasis = {
  intent: string;
  wordingStyle: string;
} & Record<string, string>;

export type GeneratedPrompt = {
  text: string;
  template: string;
  clusterId: string;
  clusterIntent: string;
  packId: string;
  samplingBasis: SamplingBasis;
};

export type PromptPackInput = {
  targetName: string;
  targetKind: string;
  marketCategory?: string;
  geography?: string;
  audience?: string;
  attributes: string[];
  comparedEntities: string[];
};

export type PromptPack = {
  id: string;
  label: string;
  description: string;
  targetKinds: string[];
  generate(input: PromptPackInput): GeneratedPrompt[];
};

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function uniquePrompts(prompts: GeneratedPrompt[]) {
  const seen = new Set<string>();
  return prompts.filter((prompt) => {
    const key = prompt.text.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
