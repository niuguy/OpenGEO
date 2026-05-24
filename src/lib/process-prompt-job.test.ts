import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  prompt: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  promptRun: {
    create: vi.fn(),
    update: vi.fn()
  },
  visibilitySnapshot: {
    create: vi.fn()
  }
};
const generateAnswer = vi.fn();
const extractAnswer = vi.fn();
const deterministicSeed = vi.fn((b: string, p: string, s: number) => 12345);

vi.mock("./prisma", () => ({ prisma }));
vi.mock("./ai/openai-client", () => ({ generateAnswer, extractAnswer, deterministicSeed }));
vi.mock("./text/jaro-winkler", () => ({
  targetNameMatches: vi.fn(() => ({ matched: true, bestScore: 1, bestCandidate: "Example Dental Clinic" }))
}));
vi.mock("./telemetry", () => ({ trackEvent: vi.fn() }));

describe("processPromptRun", () => {
  beforeEach(() => {
    vi.resetModules();
    prisma.prompt.findUnique.mockReset();
    prisma.prompt.findMany.mockReset();
    prisma.promptRun.create.mockReset();
    prisma.promptRun.update.mockReset();
    prisma.visibilitySnapshot.create.mockReset();
    generateAnswer.mockReset();
    extractAnswer.mockReset();
    process.env.OPENAI_MODEL = "gpt-test";
  });

  it("persists Langfuse trace IDs returned by the prompt generation call", async () => {
    prisma.prompt.findUnique.mockResolvedValue(promptFixture());
    prisma.promptRun.create.mockResolvedValue({ id: "run-1" });
    prisma.promptRun.update.mockResolvedValue({});
    prisma.prompt.findMany.mockResolvedValue([]);
    generateAnswer.mockResolvedValue({
      model: "gpt-test",
      rawAnswer: "Answer text",
      trace: {
        langfuseTraceId: "trace-1",
        langfuseObservationId: "obs-1",
        langfuseTraceUrl: "https://langfuse.example.com/trace/trace-1",
        latencyMs: 50,
        tokenUsage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
      }
    });
    extractAnswer.mockResolvedValue(extractionFixture());

    const { processPromptRun } = await import("./process-prompt-job");
    await processPromptRun("prompt-1", { evaluationRunId: "eval-1", sampleIndex: 2 });

    expect(prisma.promptRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({
          langfuseTraceId: "trace-1",
          langfuseObservationId: "obs-1",
          tokenUsage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
        })
      })
    );
    const completedUpdate = prisma.promptRun.update.mock.calls.find(
      ([call]) => call.data?.status === "COMPLETED"
    )?.[0];
    expect(completedUpdate?.data.extractionResult.create.referenceSignals.create).toEqual([
      {
        sourceType: "google_maps_reviews",
        label: "Google Maps reviews",
        url: null,
        evidence: "The answer mentions review signals.",
        mentionedForBusinesses: ["Example Dental Clinic"]
      }
    ]);
  });

  it("skips DRAFT prompts without calling the LLM (regression guard for worker DRAFT defense)", async () => {
    prisma.prompt.findUnique.mockResolvedValue(promptFixture({ status: "DRAFT" }));
    prisma.promptRun.create.mockResolvedValue({ id: "run-skipped" });

    const { processPromptRun } = await import("./process-prompt-job");
    const runId = await processPromptRun("prompt-1");

    expect(runId).toBe("run-skipped");
    expect(generateAnswer).not.toHaveBeenCalled();
    expect(extractAnswer).not.toHaveBeenCalled();
    expect(prisma.promptRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          error: "prompt not active (status=DRAFT)"
        })
      })
    );
    expect(prisma.promptRun.update).not.toHaveBeenCalled();
  });

  it("skips ARCHIVED prompts the same way", async () => {
    prisma.prompt.findUnique.mockResolvedValue(promptFixture({ status: "ARCHIVED" }));
    prisma.promptRun.create.mockResolvedValue({ id: "run-skipped" });

    const { processPromptRun } = await import("./process-prompt-job");
    await processPromptRun("prompt-1");

    expect(generateAnswer).not.toHaveBeenCalled();
    expect(prisma.promptRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", error: "prompt not active (status=ARCHIVED)" })
      })
    );
  });

  it("PR-A: stores temperature/seed/systemFingerprint on the PromptRun and lets the deterministic name match override targetAppears", async () => {
    prisma.prompt.findUnique.mockResolvedValue(promptFixture());
    prisma.promptRun.create.mockResolvedValue({ id: "run-1" });
    prisma.promptRun.update.mockResolvedValue({});
    prisma.prompt.findMany.mockResolvedValue([]);
    generateAnswer.mockResolvedValue({
      provider: "chatgpt",
      model: "gpt-4o-mini-2024-07-18",
      rawAnswer: "Answer mentioning the target",
      temperature: 0,
      seed: BigInt(12345),
      systemFingerprint: "fp_abc123",
      trace: { langfuseTraceId: null, langfuseObservationId: null, langfuseTraceUrl: null, latencyMs: 10, tokenUsage: null }
    });
    // LLM claims targetAppears=false; the deterministic JW match (mocked to
    // matched=true at top of file) MUST override and set targetAppears=true
    // with detectionMethod="deterministic".
    extractAnswer.mockResolvedValue({
      ...extractionFixture(),
      targetAppears: false,
      mentionedBusinesses: [{ name: "Example Dental Clinic Ltd", rank: 1, sentiment: "positive", reasons: [] }]
    });

    const { processPromptRun } = await import("./process-prompt-job");
    await processPromptRun("prompt-1", { evaluationRunId: "eval-1", sampleIndex: 0 });

    const completedUpdate = prisma.promptRun.update.mock.calls.find(
      ([call]) => call.data?.status === "COMPLETED"
    )?.[0];
    expect(completedUpdate?.data.temperature).toBe(0);
    expect(completedUpdate?.data.seed).toBe(BigInt(12345));
    expect(completedUpdate?.data.systemFingerprint).toBe("fp_abc123");
    expect(completedUpdate?.data.extractionResult.create.targetAppears).toBe(true);
    expect(completedUpdate?.data.extractionResult.create.detectionMethod).toBe("deterministic");
  });

  it("PR-A: falls back to LLM targetAppears + detectionMethod=llm when mentionedBusinesses is empty", async () => {
    prisma.prompt.findUnique.mockResolvedValue(promptFixture());
    prisma.promptRun.create.mockResolvedValue({ id: "run-1" });
    prisma.promptRun.update.mockResolvedValue({});
    prisma.prompt.findMany.mockResolvedValue([]);
    generateAnswer.mockResolvedValue({
      provider: "chatgpt",
      model: "gpt-4o-mini-2024-07-18",
      rawAnswer: "Answer",
      temperature: 0,
      seed: BigInt(7),
      systemFingerprint: null,
      trace: { langfuseTraceId: null, langfuseObservationId: null, langfuseTraceUrl: null, latencyMs: 10, tokenUsage: null }
    });
    extractAnswer.mockResolvedValue({
      ...extractionFixture(),
      targetAppears: false,
      mentionedBusinesses: []
    });

    const { processPromptRun } = await import("./process-prompt-job");
    await processPromptRun("prompt-1");

    const completedUpdate = prisma.promptRun.update.mock.calls.find(
      ([call]) => call.data?.status === "COMPLETED"
    )?.[0];
    expect(completedUpdate?.data.extractionResult.create.targetAppears).toBe(false);
    expect(completedUpdate?.data.extractionResult.create.detectionMethod).toBe("llm");
  });

  it("completes the prompt run when tracing returns no IDs", async () => {
    prisma.prompt.findUnique.mockResolvedValue(promptFixture());
    prisma.promptRun.create.mockResolvedValue({ id: "run-1" });
    prisma.promptRun.update.mockResolvedValue({});
    prisma.prompt.findMany.mockResolvedValue([]);
    generateAnswer.mockResolvedValue({
      model: "gpt-test",
      rawAnswer: "Answer text",
      trace: {
        langfuseTraceId: null,
        langfuseObservationId: null,
        langfuseTraceUrl: null,
        latencyMs: 50,
        tokenUsage: null
      }
    });
    extractAnswer.mockResolvedValue(extractionFixture());

    const { processPromptRun } = await import("./process-prompt-job");
    await expect(processPromptRun("prompt-1")).resolves.toBe("run-1");

    expect(prisma.promptRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          langfuseTraceId: null
        })
      })
    );
  });
});

function promptFixture(overrides: { status?: "DRAFT" | "ACTIVE" | "ARCHIVED" } = {}) {
  return {
    id: "prompt-1",
    businessId: "business-1",
    text: "best dentist in Woking",
    clusterId: "best-local-category",
    clusterIntent: "Best local provider recommendation",
    status: overrides.status ?? "ACTIVE",
    business: {
      id: "business-1",
      name: "Example Dental Clinic",
      category: "dentist",
      location: "Woking, Surrey",
      targetAttributes: [],
      competitors: []
    }
  };
}

function extractionFixture() {
  return {
    targetAppears: true,
    targetRank: 1,
    sentiment: "positive",
    reasons: ["mentioned"],
    sources: [],
    referenceSignals: [
      {
        sourceType: "google_maps_reviews",
        label: "Google Maps reviews",
        url: null,
        evidence: "The answer mentions review signals.",
        mentionedForBusinesses: ["Example Dental Clinic"]
      }
    ],
    confidence: 0.9,
    mentionedBusinesses: [
      {
        name: "Example Dental Clinic",
        rank: 1,
        sentiment: "positive",
        reasons: ["mentioned"]
      }
    ],
    semanticAttributes: []
  };
}
