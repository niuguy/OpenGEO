import { beforeEach, describe, expect, it, vi } from "vitest";

const completionCreate = vi.fn();
const observeOpenAI = vi.fn((client) => client);
const createTraceHandle = vi.fn();
const finishTrace = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: completionCreate
      }
    }
  }))
}));

vi.mock("@langfuse/openai", () => ({
  observeOpenAI
}));

vi.mock("@/lib/observability/langfuse", () => ({
  createTraceHandle,
  failTrace: vi.fn(),
  finishTrace,
  getEnvironmentTag: () => "test",
  isLangfuseEnabled: () => true
}));

describe("generateAnswer", () => {
  beforeEach(() => {
    vi.resetModules();
    completionCreate.mockReset();
    observeOpenAI.mockClear();
    createTraceHandle.mockReset();
    finishTrace.mockClear();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_MODEL = "gpt-test";
    process.env.GEMINI_API_KEY = "gemini-test";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
  });

  it("uses the Langfuse OpenAI wrapper when a trace handle exists", async () => {
    createTraceHandle.mockReturnValue({
      traceId: "trace-1",
      observationId: "obs-1",
      traceUrl: "https://langfuse.example.com/trace/trace-1",
      parentSpanContext: {
        traceId: "trace-1",
        spanId: "span-1",
        traceFlags: 1
      },
      observation: {}
    });
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: "Recommended answer" } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    });

    const { generateAnswer } = await import("./openai-client");
    const result = await generateAnswer(
      "best dentist in Woking",
      {
        businessId: "business-1",
        businessName: "Example Dental Clinic",
        category: "dentist",
        location: "Woking, Surrey",
        competitors: [],
        targetAttributes: []
      },
      {
        evaluationRunId: "eval-1",
        promptClusterId: "cluster-1",
        promptClusterIntent: "Best local provider",
        promptId: "prompt-1",
        sampleIndex: 0
      }
    );

    expect(observeOpenAI).toHaveBeenCalled();
    expect(result.rawAnswer).toBe("Recommended answer");
    expect(result.trace.langfuseTraceId).toBe("trace-1");
    expect(result.trace.tokenUsage?.total_tokens).toBe(15);
    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        // PR-A: observation path is locked to temperature=0; the env-var
        // override was removed because one stale .env was enough to silently
        // revert the reproducibility moat.
        temperature: 0,
        messages: expect.arrayContaining([
          {
            role: "user",
            content: "best dentist in Woking"
          }
        ])
      })
    );
    expect(JSON.stringify(completionCreate.mock.calls[0][0].messages)).not.toContain("Target business");
    expect(finishTrace).toHaveBeenCalledWith(expect.anything(), "Recommended answer");
  });

  it("forwards the seed when provided and surfaces system_fingerprint in the result", async () => {
    createTraceHandle.mockReturnValue(null);
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: "Answer" } }],
      usage: null,
      system_fingerprint: "fp_8f3e2a"
    });

    const { generateAnswer, deterministicSeed } = await import("./openai-client");
    const seed = deterministicSeed("business-1", "prompt-1", 0);
    const result = await generateAnswer(
      "best dentist in Woking",
      {
        businessId: "business-1",
        businessName: "Example Dental Clinic",
        category: "dentist",
        location: "Woking, Surrey",
        competitors: [],
        targetAttributes: []
      },
      {
        evaluationRunId: "eval-1",
        promptClusterId: "cluster-1",
        promptClusterIntent: "Best local provider",
        promptId: "prompt-1",
        sampleIndex: 0
      },
      {},
      "chatgpt",
      { seed }
    );

    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0,
        seed
      })
    );
    expect(result.systemFingerprint).toBe("fp_8f3e2a");
    expect(result.seed).toBe(BigInt(seed));
    expect(result.temperature).toBe(0);
  });

  it("does not send seed to Gemini's OpenAI-compatible endpoint", async () => {
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: "Gemini answer" } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    });

    const { generateAnswer, deterministicSeed } = await import("./openai-client");
    const seed = deterministicSeed("business-1", "prompt-1", 0);
    const result = await generateAnswer(
      "best dentist in Woking",
      {
        businessId: "business-1",
        businessName: "Example Dental Clinic",
        category: "dentist",
        location: "Woking, Surrey",
        competitors: [],
        targetAttributes: []
      },
      {
        evaluationRunId: "eval-1",
        promptClusterId: "cluster-1",
        promptClusterIntent: "Best local provider",
        promptId: "prompt-1",
        sampleIndex: 0
      },
      {},
      "gemini",
      { seed }
    );

    expect(completionCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        seed: expect.anything()
      })
    );
    expect(result.provider).toBe("gemini");
    expect(result.seed).toBe(BigInt(seed));
    expect(result.trace.tokenUsage?.total_tokens).toBe(15);
  });

  it("deterministicSeed is stable per (businessId, promptId, sampleIndex)", async () => {
    const { deterministicSeed } = await import("./openai-client");
    expect(deterministicSeed("biz-1", "p-1", 0)).toBe(deterministicSeed("biz-1", "p-1", 0));
    expect(deterministicSeed("biz-1", "p-1", 0)).not.toBe(deterministicSeed("biz-1", "p-1", 1));
    expect(deterministicSeed("biz-1", "p-1", 0)).not.toBe(deterministicSeed("biz-2", "p-1", 0));
    expect(deterministicSeed("biz-1", "p-1", 0)).not.toBe(deterministicSeed("biz-1", "p-2", 0));
  });

  it("continues OpenAI call flow when tracing is unavailable", async () => {
    createTraceHandle.mockReturnValue(null);
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: "Fallback answer" } }],
      usage: null
    });

    const { generateAnswer } = await import("./openai-client");
    const result = await generateAnswer(
      "recommend a dentist",
      {
        businessId: "business-1",
        businessName: "Example Dental Clinic",
        category: "dentist",
        location: "Woking, Surrey",
        competitors: [],
        targetAttributes: []
      },
      {
        evaluationRunId: "eval-1",
        promptClusterId: "cluster-1",
        promptClusterIntent: "Direct recommendation",
        promptId: "prompt-1",
        sampleIndex: 0
      }
    );

    expect(result.rawAnswer).toBe("Fallback answer");
    expect(result.trace.langfuseTraceId).toBeNull();
  });
});
