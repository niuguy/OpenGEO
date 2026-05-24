import { prisma } from "./prisma";
import { extractAnswer, generateAnswer } from "./ai/openai-client";
import type { ObservationProvider } from "./ai/openai-client";
import type { ExtractionResultPayload } from "./extraction-schema";
import { calculateGeoMetrics } from "./geo-metrics";
import { trackEvent } from "./telemetry";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function resolveTargetRank(payload: ExtractionResultPayload, businessName: string) {
  if (payload.targetRank) {
    return payload.targetRank;
  }

  const target = payload.mentionedBusinesses.find(
    (mentioned) => normalizeName(mentioned.name) === normalizeName(businessName)
  );

  return target?.rank ?? null;
}

export async function processPromptRun(
  promptId: string,
  options: { openAiApiKey?: string; evaluationRunId?: string; sampleIndex?: number; provider?: ObservationProvider } = {}
) {
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      business: {
        include: {
          competitors: true
        }
      }
    }
  });

  if (!prompt) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  // Defense in depth: the API enqueue path filters by status=ACTIVE, but if a
  // DRAFT/ARCHIVED prompt id ever reaches the worker (bug, manual call,
  // misconfigured monitoring sweep), do not spend LLM money. Record a FAILED
  // run so the skip is visible in history.
  if (prompt.status !== "ACTIVE") {
    const skipped = await prisma.promptRun.create({
      data: {
        promptId: prompt.id,
        evaluationRunId: options.evaluationRunId,
        provider: options.provider ?? "chatgpt",
        sampleIndex: options.sampleIndex ?? 0,
        model: initialModelForProvider(options.provider ?? "chatgpt"),
        status: "FAILED",
        error: `prompt not active (status=${prompt.status})`,
        completedAt: new Date()
      }
    });
    return skipped.id;
  }

  const run = await prisma.promptRun.create({
    data: {
      promptId: prompt.id,
      evaluationRunId: options.evaluationRunId,
      provider: options.provider ?? "chatgpt",
      sampleIndex: options.sampleIndex ?? 0,
      model: initialModelForProvider(options.provider ?? "chatgpt"),
      status: "RUNNING"
    }
  });

  try {
    const context = {
      businessId: prompt.businessId,
      businessName: prompt.business.name,
      category: prompt.business.category,
      location: prompt.business.location,
      competitors: prompt.business.competitors.map((competitor) => competitor.name),
      targetAttributes: prompt.business.targetAttributes
    };
    const evaluationRunId = options.evaluationRunId || run.id;

    const answer = await generateAnswer(
      prompt.text,
      context,
      {
        evaluationRunId,
        promptClusterId: prompt.clusterId,
        promptClusterIntent: prompt.clusterIntent,
        promptId: prompt.id,
        sampleIndex: options.sampleIndex ?? 0
      },
      { apiKey: options.openAiApiKey },
      options.provider ?? "chatgpt"
    );

    await prisma.promptRun.update({
      where: { id: run.id },
      data: {
        evaluationRunId,
        provider: answer.provider,
        model: answer.model,
        rawAnswer: answer.rawAnswer,
        tokenUsage: answer.trace.tokenUsage ?? undefined,
        langfuseTraceId: answer.trace.langfuseTraceId,
        langfuseObservationId: answer.trace.langfuseObservationId,
        langfuseTraceUrl: answer.trace.langfuseTraceUrl
      }
    });

    const extraction = await extractAnswer(
      prompt.text,
      answer.rawAnswer,
      context,
      {
        evaluationRunId,
        promptRunId: run.id,
        businessId: prompt.businessId,
        extractionVersion: "2026-05-10",
        schemaVersion: "local-ai-visibility-extraction-v1"
      },
      { apiKey: options.openAiApiKey }
    );
    const targetRank = resolveTargetRank(extraction, prompt.business.name);

    await prisma.promptRun.update({
      where: { id: run.id },
      data: {
        model: answer.model,
        provider: answer.provider,
        rawAnswer: answer.rawAnswer,
        tokenUsage: answer.trace.tokenUsage ?? undefined,
        langfuseTraceId: answer.trace.langfuseTraceId,
        langfuseObservationId: answer.trace.langfuseObservationId,
        langfuseTraceUrl: answer.trace.langfuseTraceUrl,
        status: "COMPLETED",
        completedAt: new Date(),
        extractionResult: {
          create: {
            targetAppears: extraction.targetAppears,
            targetRank,
            sentiment: extraction.sentiment,
            reasons: extraction.reasons,
            sources: extraction.sources,
            confidence: extraction.confidence,
            mentionedBusinesses: {
              create: extraction.mentionedBusinesses.map((mentioned) => ({
                name: mentioned.name,
                rank: mentioned.rank,
                sentiment: mentioned.sentiment,
                reasons: mentioned.reasons
              }))
            },
            semanticAttributes: {
              create: extraction.semanticAttributes.map((attribute) => ({
                label: attribute.label,
                evidence: attribute.evidence
              }))
            },
            referenceSignals: {
              create: extraction.referenceSignals.map((signal) => ({
                sourceType: signal.sourceType,
                label: signal.label,
                url: signal.url,
                evidence: signal.evidence,
                mentionedForBusinesses: signal.mentionedForBusinesses
              }))
            }
          }
        }
      }
    });

    await refreshVisibilitySnapshotForProvider(prompt.businessId, answer.provider);
    await trackEvent("prompt_run_completed", {
      businessId: prompt.businessId,
      promptId: prompt.id,
      provider: answer.provider,
      model: answer.model,
      targetAppears: extraction.targetAppears,
      directApiKeyUsed: Boolean(options.openAiApiKey)
    });
  } catch (error) {
    await prisma.promptRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown prompt run error",
        completedAt: new Date()
      }
    });
    await trackEvent("prompt_run_failed", {
      businessId: prompt.businessId,
      promptId: prompt.id,
      directApiKeyUsed: Boolean(options.openAiApiKey)
    });
    throw error;
  }

  return run.id;
}

export async function refreshVisibilitySnapshot(businessId: string) {
  return refreshVisibilitySnapshotForProvider(businessId, "chatgpt");
}

export async function refreshVisibilitySnapshotForProvider(businessId: string, provider: ObservationProvider) {
  const prompts = await prisma.prompt.findMany({
    where: {
      businessId,
      status: "ACTIVE"
    },
    include: {
      runs: {
        where: { status: "COMPLETED", provider },
        include: {
          extractionResult: {
            include: {
              mentionedBusinesses: true
            }
          }
        }
      },
      business: {
        include: {
          competitors: true
        }
      }
    }
  });

  const results = prompts.flatMap((prompt) =>
    prompt.runs.flatMap((run) =>
      run.extractionResult
        ? [
            {
              promptId: prompt.id,
              targetAppears: run.extractionResult.targetAppears,
              targetRank: run.extractionResult.targetRank,
              reasons: run.extractionResult.reasons,
              sources: run.extractionResult.sources,
              mentionedBusinesses: run.extractionResult.mentionedBusinesses
            }
          ]
        : []
    )
  );
  const metrics = calculateGeoMetrics({
    promptCount: prompts.length,
    results,
    targetName: prompts[0]?.business.name,
    competitorNames: prompts[0]?.business.competitors.map((competitor) => competitor.name) ?? []
  });

  await prisma.visibilitySnapshot.create({
    data: {
      businessId,
      provider,
      totalPrompts: prompts.length,
      mentionedPrompts: results.filter((result) => result.targetAppears).length,
      visibilityScore: metrics.visibilityRate,
      averageRank: metrics.averageObservedPosition,
      recommendationRate: metrics.recommendationRate,
      shareOfVoice: metrics.shareOfVoice,
      positionWeightedVisibility: metrics.positionWeightedVisibility,
      recommendationConsistency: metrics.recommendationConsistency,
      competitorShare: metrics.competitorShareOfRecommendations,
      volatilityScore: metrics.volatilityScore,
      sourceMentions: metrics.sourceMentions,
      sourceDiversity: metrics.sourceDiversity,
      reliabilityScore: metrics.reliabilityScore,
      reliabilityLabel: metrics.reliabilityLabel,
      topCompetitorDisplacement: metrics.topCompetitorDisplacement
    }
  });
}

function initialModelForProvider(provider: ObservationProvider) {
  if (provider === "gemini") {
    return process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  if (provider === "google_ai_overview") {
    return process.env.GOOGLE_AIO_MODEL || "google-ai-overview";
  }

  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}
