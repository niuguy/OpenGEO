import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  prompt: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn()
  }
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("customPromptInputSchema", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("trims whitespace, collapses internal runs, then validates length", async () => {
    const { customPromptInputSchema } = await import("../persist");

    expect(customPromptInputSchema.parse("  best  dentist   in Woking  ")).toBe(
      "best dentist in Woking"
    );
  });

  it("rejects strings shorter than 8 chars after trim", async () => {
    const { customPromptInputSchema } = await import("../persist");

    expect(() => customPromptInputSchema.parse("   short  ")).toThrow(/at least 8/);
  });

  it("rejects strings longer than 500 chars", async () => {
    const { customPromptInputSchema } = await import("../persist");

    expect(() => customPromptInputSchema.parse("x".repeat(501))).toThrow(/at most 500/);
  });
});

describe("persistUserPrompt", () => {
  beforeEach(() => {
    vi.resetModules();
    prisma.prompt.findUnique.mockReset();
    prisma.prompt.create.mockReset();
  });

  it("creates a user-source prompt on the happy path", async () => {
    prisma.prompt.findUnique.mockResolvedValue(null);
    prisma.prompt.create.mockResolvedValue({ id: "p1" });

    const { persistUserPrompt } = await import("../persist");
    const result = await persistUserPrompt("biz-1", "  best   dentist for kids in Woking  ");

    expect(result).toEqual({ ok: true, promptId: "p1" });
    expect(prisma.prompt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: "biz-1",
          text: "best dentist for kids in Woking",
          source: "user",
          status: "ACTIVE"
        })
      })
    );
  });

  it("returns a validation error for short text", async () => {
    const { persistUserPrompt } = await import("../persist");
    const result = await persistUserPrompt("biz-1", "  hi  ");

    expect(result).toEqual({ ok: false, reason: "validation", message: expect.stringMatching(/at least 8/) });
    expect(prisma.prompt.create).not.toHaveBeenCalled();
  });

  it("returns a duplicate error and surfaces the existing prompt id", async () => {
    prisma.prompt.findUnique.mockResolvedValue({ id: "existing-1" });

    const { persistUserPrompt } = await import("../persist");
    const result = await persistUserPrompt("biz-1", "best dentist in Woking");

    expect(result).toEqual({ ok: false, reason: "duplicate", existingPromptId: "existing-1" });
    expect(prisma.prompt.create).not.toHaveBeenCalled();
  });
});

describe("persistGeneratedPrompts", () => {
  beforeEach(() => {
    vi.resetModules();
    prisma.prompt.upsert.mockReset();
    prisma.prompt.updateMany.mockReset();
  });

  it("upserts each generated prompt and archives stale generated prompts only", async () => {
    prisma.prompt.upsert.mockResolvedValue({});
    prisma.prompt.updateMany.mockResolvedValue({ count: 0 });

    const { persistGeneratedPrompts } = await import("../persist");
    await persistGeneratedPrompts("biz-1", [
      {
        text: "best dentist in Woking",
        template: "best-local",
        clusterId: "c1",
        clusterIntent: "best",
        packId: "local-business",
        samplingBasis: { intent: "best", locationStyle: "city", specificity: "category", persona: "any", wordingStyle: "natural", decisionMode: "open" }
      }
    ]);

    expect(prisma.prompt.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.prompt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          source: "generated",
          status: "DRAFT",
          samplingBasis: expect.objectContaining({ packId: "local-business" })
        })
      })
    );
    // Archive scope MUST include source: "generated" so user-added prompts survive.
    expect(prisma.prompt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: "biz-1",
          source: "generated",
          text: { notIn: ["best dentist in Woking"] }
        }),
        data: { status: "ARCHIVED" }
      })
    );
  });
});
