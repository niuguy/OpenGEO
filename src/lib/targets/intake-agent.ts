import OpenAI from "openai";
import { z } from "zod";
import { targetKindSchema } from "@/lib/targets/target-profile-schema";
import type { TargetKind, TargetProfile } from "@/lib/targets/target-profile";

// Intake agent (plan Phase 1). Given whatever seed signal we have — a website
// crawl summary and/or a name — it suggests a complete TargetProfile, with the
// target-KIND classification (local vs national/public brand vs saas/person)
// front and centre because that fork drives which pack runs and which fields
// the wizard asks for. The user confirms/edits the suggestion at Gate 1; this
// is a starting point, never the final word.

export const intakeSuggestionSchema = z.object({
  name: z.string(),
  kind: targetKindSchema,
  marketCategory: z.string(),
  // geography is meaningful only for local targets; null for national/public.
  geography: z.string().nullable(),
  audience: z.string().nullable(),
  attributes: z.array(z.string()),
  comparedEntities: z.array(z.string()),
  kindRationale: z.string(),
  confidence: z.number().min(0).max(1)
});

export type IntakeSuggestion = z.infer<typeof intakeSuggestionSchema>;

const intakeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "kind",
    "marketCategory",
    "geography",
    "audience",
    "attributes",
    "comparedEntities",
    "kindRationale",
    "confidence"
  ],
  properties: {
    name: { type: "string" },
    kind: {
      type: "string",
      enum: ["local_business", "saas", "ecommerce", "publisher", "person", "org", "developer_tool"]
    },
    marketCategory: { type: "string" },
    geography: { type: ["string", "null"] },
    audience: { type: ["string", "null"] },
    attributes: { type: "array", items: { type: "string" } },
    comparedEntities: { type: "array", items: { type: "string" } },
    kindRationale: { type: "string" },
    confidence: { type: "number" }
  }
} as const;

export type IntakeSignal = {
  name?: string;
  websiteUrl?: string;
  crawlSummary?: string;
  inferred?: {
    category?: string;
    location?: string;
    attributes?: string[];
  };
};

export type IntakeOptions = {
  apiKey?: string;
  model?: string;
};

export type IntakeResult = {
  suggestion: IntakeSuggestion;
  usedLlm: boolean;
};

const SYSTEM_PROMPT = [
  "You set up an AI-visibility audit for one target (a business, brand, product, or person).",
  "From the signals provided, propose a complete profile.",
  "The single most important decision is `kind`:",
  "- local_business: serves a physical catchment; people search it WITH a place (a dentist, a plumber, a local accountant).",
  "- saas / ecommerce / publisher / developer_tool / org / person: national or online; geography is usually not how people search for it.",
  "Set geography to a concrete place ONLY for local_business; otherwise null.",
  "marketCategory is the short noun phrase a consumer would use (e.g. 'dentist', 'project management tool', 'running shoe brand').",
  "audience is who it serves, when that's how it's chosen (e.g. 'small UK law firms'); null when not useful.",
  "attributes are 2-6 distinguishing qualities worth testing; comparedEntities are real competitors/alternatives if evident.",
  "kindRationale: one short sentence on why you chose that kind. Be honest about low confidence."
].join("\n");

function deterministicFallback(signal: IntakeSignal): IntakeSuggestion {
  // No LLM available: assume local_business from the inferred crawl fields. This
  // matches the platform's historical default and keeps setup working offline.
  const location = signal.inferred?.location;
  return {
    name: signal.name ?? "",
    kind: "local_business",
    marketCategory: signal.inferred?.category ?? "",
    geography: location && location !== "Unknown location" ? location : null,
    audience: null,
    attributes: signal.inferred?.attributes ?? [],
    comparedEntities: [],
    kindRationale: "Defaulted to a local business — set up without AI assistance.",
    confidence: 0.2
  };
}

export async function inferTargetProfile(
  signal: IntakeSignal,
  options: IntakeOptions = {}
): Promise<IntakeResult> {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { suggestion: deterministicFallback(signal), usedLlm: false };
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
        json_schema: { name: "intake_target_profile", strict: true, schema: intakeJsonSchema }
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Name (best guess): ${signal.name ?? "unknown"}`,
            `Website: ${signal.websiteUrl ?? "none"}`,
            `Crawl-inferred category: ${signal.inferred?.category ?? "unknown"}`,
            `Crawl-inferred location: ${signal.inferred?.location ?? "unknown"}`,
            `Crawl-inferred attributes: ${signal.inferred?.attributes?.join(", ") || "none"}`,
            "",
            "Website summary (may be empty):",
            (signal.crawlSummary ?? "").slice(0, 6000) || "(none)"
          ].join("\n")
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { suggestion: deterministicFallback(signal), usedLlm: false };
    }
    const suggestion = intakeSuggestionSchema.parse(JSON.parse(content));
    return { suggestion, usedLlm: true };
  } catch (error) {
    console.warn("Intake agent failed; using deterministic fallback.", error);
    return { suggestion: deterministicFallback(signal), usedLlm: false };
  }
}

// Map a confirmed suggestion to the canonical TargetProfile (geography/audience
// dropped to undefined when null, per the type's optional fields).
export function suggestionToTargetProfile(
  suggestion: IntakeSuggestion,
  websiteUrl?: string
): TargetProfile {
  return {
    name: suggestion.name,
    kind: suggestion.kind as TargetKind,
    websiteUrl: websiteUrl || undefined,
    marketCategory: suggestion.marketCategory || undefined,
    geography: suggestion.geography ?? undefined,
    audience: suggestion.audience ?? undefined,
    attributes: suggestion.attributes,
    comparedEntities: suggestion.comparedEntities
  };
}
