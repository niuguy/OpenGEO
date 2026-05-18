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
        temperature: 0.7,
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
