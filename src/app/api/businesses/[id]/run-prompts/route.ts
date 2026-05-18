import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPromptRunQueue } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { processPromptRun } from "@/lib/process-prompt-job";
import { trackEvent } from "@/lib/telemetry";
import { parseObservationProviders, type ObservationProvider } from "@/lib/ai/providers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RunRequest = {
  mode?: "queue" | "direct";
  openAiApiKey?: string;
  providers?: ObservationProvider[];
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as RunRequest;
  const mode = body.mode || "queue";
  const sampleCount = Math.max(1, Number(process.env.PROMPT_SAMPLES_PER_RUN || 1));
  const providers = body.providers?.length
    ? body.providers
    : parseObservationProviders(process.env.OBSERVATION_PROVIDERS, ["chatgpt"]);
  const evaluationRunId = randomUUID();
  const prompts = await prisma.prompt.findMany({
    where: {
      businessId: id,
      status: "ACTIVE"
    },
    select: {
      id: true
    }
  });

  if (prompts.length === 0) {
    return NextResponse.json({ error: "No active prompts found. Generate prompts first." }, { status: 400 });
  }

  if (mode === "direct") {
    if (!body.openAiApiKey && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Provide an OpenAI API key for direct runs or set OPENAI_API_KEY in .env." },
        { status: 400 }
      );
    }

    const runIds = [];
    for (const provider of providers) {
      for (const prompt of prompts) {
        for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
          const runId = await processPromptRun(prompt.id, {
            openAiApiKey: body.openAiApiKey,
            evaluationRunId,
            sampleIndex,
            provider
          });
          runIds.push(runId);
        }
      }
    }

    await trackEvent("prompt_runs_direct_completed", {
      businessId: id,
      promptCount: prompts.length,
      sampleCount,
      providers,
      evaluationRunId,
      directApiKeyUsed: Boolean(body.openAiApiKey)
    });

    return NextResponse.json({ mode, evaluationRunId, completed: runIds.length, runIds });
  }

  if (body.openAiApiKey) {
    return NextResponse.json(
      { error: "Queued worker runs do not accept request API keys. Set OPENAI_API_KEY in .env and run pnpm worker." },
      { status: 400 }
    );
  }

  const queue = getPromptRunQueue();
  const jobs = await Promise.all(
    providers.flatMap((provider) =>
      prompts.flatMap((prompt) =>
        Array.from({ length: sampleCount }, (_value, sampleIndex) =>
        queue.add(
          "run-prompt",
          { promptId: prompt.id, evaluationRunId, sampleIndex, provider },
          {
            attempts: 2,
            backoff: {
              type: "exponential",
              delay: 5000
            },
            removeOnComplete: 100,
            removeOnFail: 100
          }
        )
      )
      )
    )
  );

  await trackEvent("prompt_runs_queued", {
    businessId: id,
    promptCount: prompts.length,
    sampleCount,
    providers,
    evaluationRunId
  });

  return NextResponse.json({
    mode,
    evaluationRunId,
    queued: jobs.length,
    jobs: jobs.map((job) => ({
      id: job.id,
      promptId: job.data.promptId,
      sampleIndex: job.data.sampleIndex,
      provider: job.data.provider
    }))
  });
}
