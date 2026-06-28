import OpenAI from "openai";
import { z } from "zod";
import type { GeneratedPrompt } from "@/lib/prompts/types";
import { slugify, uniquePrompts } from "@/lib/prompts/types";
import { defaultPackForTargetKind } from "@/lib/prompts/packs/registry";
import { targetProfileToPromptPackInput } from "@/lib/targets/target-profile";
import type { TargetProfile } from "@/lib/targets/target-profile";

// Prompt strategist (plan Phase 2, "packs as floor"). The deterministic pack
// produces the base set; the LLM returns EDITS — never a from-scratch prompt
// set — so reproducibility and the samplingBasis audit trail survive and the
// PR-A bias risk (see local-business.ts) stays contained. If the LLM call fails
// or returns nothing usable, callers get the untouched base set.

export type StrategistPrompt = GeneratedPrompt & { rationale?: string | null };

export const strategistEditSchema = z.object({
  // clusterIds from the base set to drop as irrelevant to this target.
  drops: z.array(z.string()),
  // text replacements for base prompts, keyed by clusterId. Wording only — the
  // cluster's intent/persona metadata is preserved.
  rephrasings: z.array(z.object({ clusterId: z.string(), text: z.string() })),
  // one-line "why this prompt matters" per kept base prompt, keyed by clusterId.
  rationales: z.array(z.object({ clusterId: z.string(), rationale: z.string() })),
  // a few profile-specific prompts the templates can't anticipate.
  additions: z.array(
    z.object({
      text: z.string(),
      clusterIntent: z.string(),
      intent: z.string(),
      wordingStyle: z.string(),
      rationale: z.string()
    })
  )
});

export type StrategistEdit = z.infer<typeof strategistEditSchema>;

// Strict json_schema mirror for response_format (house pattern, see
// extraction-schema.ts). Every property required, additionalProperties false.
export const strategistEditJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["drops", "rephrasings", "rationales", "additions"],
  properties: {
    drops: { type: "array", items: { type: "string" } },
    rephrasings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["clusterId", "text"],
        properties: { clusterId: { type: "string" }, text: { type: "string" } }
      }
    },
    rationales: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["clusterId", "rationale"],
        properties: { clusterId: { type: "string" }, rationale: { type: "string" } }
      }
    },
    additions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "clusterIntent", "intent", "wordingStyle", "rationale"],
        properties: {
          text: { type: "string" },
          clusterIntent: { type: "string" },
          intent: { type: "string" },
          wordingStyle: { type: "string" },
          rationale: { type: "string" }
        }
      }
    }
  }
} as const;

const MAX_ADDITIONS = 6;

// Pure application of edits onto a base set. No I/O — this is the unit-tested
// core; proposePrompts() wraps it with the LLM call.
export function applyStrategistEdits(
  base: GeneratedPrompt[],
  edits: StrategistEdit,
  packId: string
): StrategistPrompt[] {
  const dropped = new Set(edits.drops);
  const rephraseByCluster = new Map(edits.rephrasings.map((r) => [r.clusterId, r.text.trim()]));
  const rationaleByCluster = new Map(edits.rationales.map((r) => [r.clusterId, r.rationale.trim()]));

  const kept: StrategistPrompt[] = base
    .filter((prompt) => !dropped.has(prompt.clusterId))
    .map((prompt) => {
      const rephrased = rephraseByCluster.get(prompt.clusterId);
      const text = rephrased && rephrased.length > 0 ? rephrased : prompt.text;
      return {
        ...prompt,
        text,
        rationale: rationaleByCluster.get(prompt.clusterId) ?? null
      };
    });

  const additions: StrategistPrompt[] = edits.additions
    .map((addition) => addition.text.trim())
    .filter((text) => text.length > 0)
    .slice(0, MAX_ADDITIONS)
    .map((text, index) => {
      const source = edits.additions[index];
      return {
        text,
        template: text,
        clusterId: `strategist-${slugify(text).slice(0, 48) || index}`,
        clusterIntent: source.clusterIntent.trim() || "Strategist addition",
        packId,
        samplingBasis: {
          intent: source.intent.trim() || "strategist-specific",
          wordingStyle: source.wordingStyle.trim() || "conversational",
          origin: "strategist"
        },
        rationale: source.rationale.trim() || null
      } satisfies StrategistPrompt;
    });

  return uniquePrompts([...kept, ...additions]) as StrategistPrompt[];
}

const SYSTEM_PROMPT = [
  "You tune a set of AI-visibility audit prompts for one specific target.",
  "The prompts simulate real consumers asking an AI assistant for recommendations.",
  "You are given a base set generated from deterministic templates. Return EDITS only.",
  "Rules:",
  "- Keep every prompt a clean, natural consumer query. Never append instructions like 'explain why' or 'cite sources' — that biases answers.",
  "- Only comparison-style prompts may name the target. Discovery prompts must stay target-agnostic so the answer isn't biased.",
  "- Drop clusters that make no sense for this target (e.g. 'same-day appointment' for a target with no appointments).",
  "- Rephrase only to fix wording that reads unnatural for this category/geography; preserve the cluster's intent.",
  "- Add at most a handful of genuinely profile-specific prompts the templates could not anticipate.",
  "- Give a short, concrete rationale (max ~12 words) for each kept cluster and each addition.",
  "Reference base prompts by their clusterId exactly."
].join("\n");

export type ProposePromptsOptions = {
  apiKey?: string;
  model?: string;
};

export type ProposePromptsResult = {
  prompts: StrategistPrompt[];
  packId: string;
  usedStrategist: boolean;
};

export async function proposePrompts(
  profile: TargetProfile,
  options: ProposePromptsOptions = {}
): Promise<ProposePromptsResult> {
  const pack = defaultPackForTargetKind(profile.kind);
  const base = pack.generate(targetProfileToPromptPackInput(profile));

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No key — return the deterministic floor untouched. The audit still works.
    return { prompts: base, packId: pack.id, usedStrategist: false };
  }

  const model = options.model || process.env.STRATEGIST_MODEL || "gpt-4o";
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: Number(process.env.OPENAI_TIMEOUT_MS || 30000)
  });

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: { name: "prompt_strategist_edits", strict: true, schema: strategistEditJsonSchema }
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Target: ${profile.name}`,
            `Kind: ${profile.kind}`,
            `Market/category: ${profile.marketCategory ?? "n/a"}`,
            `Geography: ${profile.geography ?? "n/a (not a local target)"}`,
            `Audience: ${profile.audience ?? "n/a"}`,
            `Attributes: ${profile.attributes.join(", ") || "none"}`,
            `Compared entities: ${profile.comparedEntities.join(", ") || "none"}`,
            "",
            "Base prompts (clusterId :: text):",
            ...base.map((p) => `${p.clusterId} :: ${p.text}`)
          ].join("\n")
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { prompts: base, packId: pack.id, usedStrategist: false };
    }
    const edits = strategistEditSchema.parse(JSON.parse(content));
    const prompts = applyStrategistEdits(base, edits, pack.id);
    return { prompts: prompts.length > 0 ? prompts : base, packId: pack.id, usedStrategist: true };
  } catch (error) {
    // The strategist is an enhancement, never a gate. On any failure fall back
    // to the deterministic floor so audit setup never breaks on an LLM hiccup.
    console.warn("Prompt strategist failed; using deterministic base set.", error);
    return { prompts: base, packId: pack.id, usedStrategist: false };
  }
}
