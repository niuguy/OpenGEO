import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, routeContext } from "@/lib/test-utils/route-harness";

const prisma = {
  business: { findUnique: vi.fn() },
  prompt: { findUnique: vi.fn(), count: vi.fn() }
};
const persistUserPrompt = vi.fn();
const trackEvent = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/prompts/persist", () => ({ persistUserPrompt }));
vi.mock("@/lib/telemetry", () => ({ trackEvent }));

describe("POST /api/businesses/[id]/prompts", () => {
  beforeEach(() => {
    vi.resetModules();
    prisma.business.findUnique.mockReset();
    prisma.prompt.findUnique.mockReset();
    prisma.prompt.count.mockReset();
    persistUserPrompt.mockReset();
    trackEvent.mockReset();
  });

  it("creates a user prompt on the happy path and emits telemetry", async () => {
    prisma.business.findUnique.mockResolvedValue({ id: "biz-1" });
    persistUserPrompt.mockResolvedValue({ ok: true, promptId: "p-new" });
    prisma.prompt.count.mockResolvedValue(3);
    prisma.prompt.findUnique.mockResolvedValue({ id: "p-new", text: "best dentist for kids in Woking", source: "user" });

    const { POST } = await import("../route");
    const res = await POST(jsonRequest("POST", { text: "best dentist for kids in Woking" }), routeContext({ id: "biz-1" }));

    expect(res.status).toBe(201);
    expect(persistUserPrompt).toHaveBeenCalledWith("biz-1", "best dentist for kids in Woking");
    expect(trackEvent).toHaveBeenCalledWith("user_prompt_added", { businessId: "biz-1", userPromptCount: 3 });
    const json = await res.json();
    expect(json.prompt.id).toBe("p-new");
  });

  it("returns 400 when text is missing", async () => {
    const { POST } = await import("../route");
    const res = await POST(jsonRequest("POST", {}), routeContext({ id: "biz-1" }));

    expect(res.status).toBe(400);
    expect(persistUserPrompt).not.toHaveBeenCalled();
  });

  it("returns 404 when the business does not exist", async () => {
    prisma.business.findUnique.mockResolvedValue(null);

    const { POST } = await import("../route");
    const res = await POST(jsonRequest("POST", { text: "best dentist in Woking" }), routeContext({ id: "missing" }));

    expect(res.status).toBe(404);
    expect(persistUserPrompt).not.toHaveBeenCalled();
  });

  it("returns 400 on persist validation failure", async () => {
    prisma.business.findUnique.mockResolvedValue({ id: "biz-1" });
    persistUserPrompt.mockResolvedValue({ ok: false, reason: "validation", message: "Prompt must be at least 8 characters" });

    const { POST } = await import("../route");
    const res = await POST(jsonRequest("POST", { text: "short" }), routeContext({ id: "biz-1" }));

    expect(res.status).toBe(400);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("returns 409 and existingPromptId on duplicate", async () => {
    prisma.business.findUnique.mockResolvedValue({ id: "biz-1" });
    persistUserPrompt.mockResolvedValue({ ok: false, reason: "duplicate", existingPromptId: "p-existing" });

    const { POST } = await import("../route");
    const res = await POST(jsonRequest("POST", { text: "best dentist in Woking" }), routeContext({ id: "biz-1" }));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.existingPromptId).toBe("p-existing");
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
