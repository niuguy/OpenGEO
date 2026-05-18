import { observeOpenAI } from "@langfuse/openai";
import OpenAI from "openai";
import { ProxyAgent } from "proxy-agent";
import { extractionJsonSchema, extractionResultSchema } from "@/lib/extraction-schema";
import {
  createTraceHandle,
  failTrace,
  finishTrace,
  getEnvironmentTag,
  isLangfuseEnabled,
  type TraceHandle
} from "@/lib/observability/langfuse";

export type BusinessContext = {
  businessId: string;
  businessName: string;
  category: string;
  location: string;
  competitors: string[];
  targetAttributes: string[];
};

export type OpenAIAuth = {
  apiKey?: string;
};

export type ObservationProvider = "chatgpt" | "gemini" | "google_ai_overview";

export type PromptRunTraceInput = {
  evaluationRunId: string;
  promptClusterId: string;
  promptClusterIntent: string;
  promptId: string;
  sampleIndex: number;
};

export type ExtractionTraceInput = {
  evaluationRunId: string | null;
  promptRunId: string;
  businessId: string;
  extractionVersion: string;
  schemaVersion: string;
};

export type TraceResult = {
  langfuseTraceId: string | null;
  langfuseObservationId: string | null;
  langfuseTraceUrl: string | null;
  latencyMs: number;
  tokenUsage: Record<string, number> | null;
};

export type AnswerResult = {
  provider: ObservationProvider;
  model: string;
  rawAnswer: string;
  trace: TraceResult;
};

type ObservedClientOptions = {
  traceName: string;
  generationName: string;
  metadata: Record<string, unknown>;
  tags: string[];
  handle: TraceHandle | null;
};

export const CHATGPT_LIKE_SYSTEM_PROMPT =
  "You answer as a helpful consumer assistant. Give practical local recommendations from general knowledge, say when you are uncertain, and do not invent citations or exact rankings.";

function getProxyAgent() {
  const hasProxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  return hasProxy ? new ProxyAgent() : undefined;
}

function getOpenAIClient(auth: OpenAIAuth = {}, options?: ObservedClientOptions) {
  const apiKey = auth.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env before running prompt checks.");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: Number(process.env.OPENAI_TIMEOUT_MS || 30000),
    httpAgent: getProxyAgent()
  });

  if (!options?.handle || !isLangfuseEnabled()) {
    return client;
  }

  try {
    return observeOpenAI(client, {
      parentSpanContext: options.handle.parentSpanContext,
      traceName: options.traceName,
      generationName: options.generationName,
      generationMetadata: options.metadata,
      tags: options.tags
    });
  } catch (error) {
    console.warn("Langfuse OpenAI wrapper failed; using unwrapped OpenAI client.", error);
    return client;
  }
}

function categoryTag(category: string) {
  return `${category.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category"}-demo`;
}

function tokenUsageFrom(completion: OpenAI.Chat.Completions.ChatCompletion): Record<string, number> | null {
  if (!completion.usage) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(completion.usage).filter((entry): entry is [string, number] => typeof entry[1] === "number")
  );
}

export function buildPromptRunMetadata(context: BusinessContext, trace: PromptRunTraceInput, model: string) {
  return {
    businessId: context.businessId,
    businessName: context.businessName,
    location: context.location,
    category: context.category,
    evaluationRunId: trace.evaluationRunId,
    promptClusterId: trace.promptClusterId,
    promptClusterIntent: trace.promptClusterIntent,
    promptId: trace.promptId,
    sampleIndex: trace.sampleIndex,
    model,
    region: "uk",
    executionMode: "api",
    productArea: "local-ai-visibility"
  };
}

export function buildPromptRunTags(category: string) {
  return ["local-ai-visibility", "prompt-run", categoryTag(category), getEnvironmentTag()];
}

export function buildExtractionMetadata(trace: ExtractionTraceInput) {
  return {
    evaluationRunId: trace.evaluationRunId,
    promptRunId: trace.promptRunId,
    businessId: trace.businessId,
    extractionVersion: trace.extractionVersion,
    schemaVersion: trace.schemaVersion,
    productArea: "local-ai-visibility"
  };
}

export async function generateAnswer(
  prompt: string,
  context: BusinessContext,
  trace: PromptRunTraceInput,
  auth: OpenAIAuth = {},
  provider: ObservationProvider = "chatgpt"
): Promise<AnswerResult> {
  if (provider === "gemini") {
    return generateGeminiAnswer(prompt, trace);
  }

  if (provider === "google_ai_overview") {
    return generateGoogleAiOverviewAnswer(prompt, trace);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const metadata = buildPromptRunMetadata(context, trace, model);
  const handle = createTraceHandle("local-ai-visibility.prompt-run", {
    input: prompt,
    metadata,
    environment: getEnvironmentTag()
  });
  const client = getOpenAIClient(auth, {
    traceName: "local-ai-visibility.prompt-run",
    generationName: "recommendation-sample",
    metadata,
    tags: buildPromptRunTags(context.category),
    handle
  });
  const startedAt = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: Number(process.env.OPENAI_OBSERVATION_TEMPERATURE || 0.7),
      messages: [
        {
          role: "system",
          content: CHATGPT_LIKE_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const rawAnswer = completion.choices[0]?.message?.content ?? "";

    finishTrace(handle, rawAnswer);

    return {
      provider,
      model,
      rawAnswer,
      trace: {
        langfuseTraceId: handle?.traceId ?? null,
        langfuseObservationId: handle?.observationId ?? null,
        langfuseTraceUrl: handle?.traceUrl ?? null,
        latencyMs: Date.now() - startedAt,
        tokenUsage: tokenUsageFrom(completion)
      } satisfies TraceResult
    };
  } catch (error) {
    failTrace(handle, error);
    throw error;
  }
}

async function generateGeminiAnswer(prompt: string, trace: PromptRunTraceInput): Promise<AnswerResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env before running Gemini prompt checks.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const startedAt = Date.now();
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.GEMINI_OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
    timeout: Number(process.env.GEMINI_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || 30000),
    httpAgent: getProxyAgent()
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: Number(process.env.GEMINI_OBSERVATION_TEMPERATURE || process.env.OPENAI_OBSERVATION_TEMPERATURE || 0.7),
    messages: [
      {
        role: "system",
        content: CHATGPT_LIKE_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return {
    provider: "gemini",
    model,
    rawAnswer: completion.choices[0]?.message?.content ?? "",
    trace: {
      langfuseTraceId: null,
      langfuseObservationId: null,
      langfuseTraceUrl: null,
      latencyMs: Date.now() - startedAt,
      tokenUsage: tokenUsageFrom(completion)
    }
  };
}

async function generateGoogleAiOverviewAnswer(prompt: string, trace: PromptRunTraceInput): Promise<AnswerResult> {
  const apiKey = process.env.SEARCHAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SEARCHAPI_API_KEY is not set. Add it to .env before running Google AI Overview checks.");
  }

  const startedAt = Date.now();
  const baseUrl = process.env.SEARCHAPI_BASE_URL || "https://www.searchapi.io/api/v1/search";
  const params = new URLSearchParams({
    engine: "google",
    q: prompt,
    gl: process.env.GOOGLE_AIO_GL || "uk",
    hl: process.env.GOOGLE_AIO_HL || "en",
    api_key: apiKey
  });
  const searchResponse = await fetch(`${baseUrl}?${params.toString()}`);
  if (!searchResponse.ok) {
    throw new Error(`Google AI Overview search request failed: ${searchResponse.status} ${searchResponse.statusText}`);
  }

  const searchJson = (await searchResponse.json()) as {
    ai_overview?: {
      text?: string;
      snippet?: string;
      page_token?: string;
      references?: { title?: string; link?: string; snippet?: string }[];
    };
  };
  let overview = searchJson.ai_overview;

  if (overview?.page_token && !overview.text && !overview.snippet) {
    const overviewParams = new URLSearchParams({
      engine: "google_ai_overview",
      page_token: overview.page_token,
      api_key: apiKey
    });
    const overviewResponse = await fetch(`${baseUrl}?${overviewParams.toString()}`);
    if (overviewResponse.ok) {
      const overviewJson = (await overviewResponse.json()) as typeof searchJson;
      overview = overviewJson.ai_overview ?? overview;
    }
  }

  const referenceText = overview?.references
    ?.map((reference) => [reference.title, reference.link, reference.snippet].filter(Boolean).join(" - "))
    .filter(Boolean)
    .join("\n");
  const rawAnswer = [overview?.text ?? overview?.snippet ?? "", referenceText ? `References:\n${referenceText}` : ""]
    .filter(Boolean)
    .join("\n\n");

  if (!rawAnswer) {
    throw new Error("Google AI Overview was not available for this prompt.");
  }

  return {
    provider: "google_ai_overview",
    model: process.env.GOOGLE_AIO_MODEL || "google-ai-overview",
    rawAnswer,
    trace: {
      langfuseTraceId: null,
      langfuseObservationId: null,
      langfuseTraceUrl: null,
      latencyMs: Date.now() - startedAt,
      tokenUsage: null
    }
  };
}

export async function extractAnswer(
  prompt: string,
  rawAnswer: string,
  context: BusinessContext,
  trace: ExtractionTraceInput,
  auth: OpenAIAuth = {}
) {
  const model = process.env.EXTRACTION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const metadata = buildExtractionMetadata(trace);
  const handle = createTraceHandle("local-ai-visibility.extraction", {
    input: {
      prompt,
      rawAnswer
    },
    metadata,
    environment: getEnvironmentTag()
  });
  const client = getOpenAIClient(auth, {
    traceName: "local-ai-visibility.extraction",
    generationName: "structured-extraction",
    metadata,
    tags: ["local-ai-visibility", "extraction", getEnvironmentTag()],
    handle
  });

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "local_ai_visibility_extraction",
          strict: true,
          schema: extractionJsonSchema
        }
      },
      messages: [
        {
          role: "system",
          content:
            "Extract structured visibility data from the answer. Use only evidence present in the answer. Rank is the explicit order in the answer when present, otherwise null. Extract referenceSignals for model-cited evidence types such as Google Maps reviews, Trustpilot, clinic websites, NHS/private listings, local directories, opening hours, and service pages. Do not invent URLs; set url to null unless the answer explicitly includes one. If the answer references a source generically, record the source type and label with url null."
        },
        {
          role: "user",
          content: [
            `Prompt: ${prompt}`,
            `Target business: ${context.businessName}`,
            `Category: ${context.category}`,
            `Location: ${context.location}`,
            `Known competitors: ${context.competitors.join(", ") || "none provided"}`,
            `Target attributes: ${context.targetAttributes.join(", ") || "none provided"}`,
            "Answer:",
            rawAnswer
          ].join("\n")
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI extraction returned an empty response.");
    }

    const parsed = extractionResultSchema.parse(JSON.parse(content));
    finishTrace(handle, parsed);
    return parsed;
  } catch (error) {
    failTrace(handle, error);
    throw error;
  }
}
