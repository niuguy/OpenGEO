import { z } from "zod";

export const sentimentSchema = z.enum(["positive", "neutral", "negative", "unknown"]);
export const referenceSignalSourceTypeSchema = z.enum([
  "google_maps_reviews",
  "trustpilot",
  "clinic_website",
  "nhs_listing",
  "private_listing",
  "local_directory",
  "review_site",
  "social_media",
  "opening_hours",
  "service_page",
  "unknown"
]);

export const extractionResultSchema = z.object({
  mentionedBusinesses: z.array(
    z.object({
      name: z.string().min(1),
      rank: z.number().int().positive().nullable(),
      sentiment: sentimentSchema,
      reasons: z.array(z.string())
    })
  ),
  targetAppears: z.boolean(),
  targetRank: z.number().int().positive().nullable(),
  sentiment: sentimentSchema,
  semanticAttributes: z.array(
    z.object({
      label: z.string().min(1),
      evidence: z.string().nullable()
    })
  ),
  reasons: z.array(z.string()),
  sources: z.array(z.string()),
  referenceSignals: z.array(
    z.object({
      sourceType: referenceSignalSourceTypeSchema,
      label: z.string().min(1),
      url: z.string().nullable(),
      evidence: z.string().nullable(),
      mentionedForBusinesses: z.array(z.string())
    })
  ),
  confidence: z.number().min(0).max(1)
});

export type ExtractionResultPayload = z.infer<typeof extractionResultSchema>;

export const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mentionedBusinesses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          rank: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
          sentiment: { enum: ["positive", "neutral", "negative", "unknown"] },
          reasons: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["name", "rank", "sentiment", "reasons"]
      }
    },
    targetAppears: { type: "boolean" },
    targetRank: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
    sentiment: { enum: ["positive", "neutral", "negative", "unknown"] },
    semanticAttributes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          evidence: { anyOf: [{ type: "string" }, { type: "null" }] }
        },
        required: ["label", "evidence"]
      }
    },
    reasons: {
      type: "array",
      items: { type: "string" }
    },
    sources: {
      type: "array",
      items: { type: "string" }
    },
    referenceSignals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sourceType: {
            enum: [
              "google_maps_reviews",
              "trustpilot",
              "clinic_website",
              "nhs_listing",
              "private_listing",
              "local_directory",
              "review_site",
              "social_media",
              "opening_hours",
              "service_page",
              "unknown"
            ]
          },
          label: { type: "string" },
          url: { anyOf: [{ type: "string" }, { type: "null" }] },
          evidence: { anyOf: [{ type: "string" }, { type: "null" }] },
          mentionedForBusinesses: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["sourceType", "label", "url", "evidence", "mentionedForBusinesses"]
      }
    },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: [
    "mentionedBusinesses",
    "targetAppears",
    "targetRank",
    "sentiment",
    "semanticAttributes",
    "reasons",
    "sources",
    "referenceSignals",
    "confidence"
  ]
} as const;
