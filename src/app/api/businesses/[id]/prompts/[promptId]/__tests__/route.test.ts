import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, routeContext } from "@/lib/test-utils/route-harness";

const prisma = {
  prompt: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    update: vi.fn()
  },
  promptRun: { count: vi.fn() }
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("PATCH /api/businesses/[id]/prompts/[promptId]", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(prisma.prompt).forEach((fn) => fn.mockReset());
    prisma.promptRun.count.mockReset();
  });

  it("flips status when the promptId belongs to the business", async () => {
    prisma.prompt.updateMany.mockResolvedValue({ count: 1 });
    prisma.prompt.findUnique.mockResolvedValue({ id: "p1", status: "ACTIVE" });

    const { PATCH } = await import("../route");
    const res = await PATCH(jsonRequest("PATCH", { status: "ACTIVE" }), routeContext({ id: "biz-1", promptId: "p1" }));

    expect(res.status).toBe(200);
    expect(prisma.prompt.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", businessId: "biz-1" },
      data: { status: "ACTIVE" }
    });
  });

  it("returns 404 when promptId belongs to a different business (IDOR guard)", async () => {
    prisma.prompt.updateMany.mockResolvedValue({ count: 0 });

    const { PATCH } = await import("../route");
    const res = await PATCH(jsonRequest("PATCH", { status: "ACTIVE" }), routeContext({ id: "biz-1", promptId: "p-on-other-biz" }));

    expect(res.status).toBe(404);
    expect(prisma.prompt.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid status", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(jsonRequest("PATCH", { status: "ARCHIVED" }), routeContext({ id: "biz-1", promptId: "p1" }));

    expect(res.status).toBe(400);
    expect(prisma.prompt.updateMany).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/businesses/[id]/prompts/[promptId]", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(prisma.prompt).forEach((fn) => fn.mockReset());
    prisma.promptRun.count.mockReset();
  });

  it("hard-deletes a user-source prompt with no run history", async () => {
    prisma.prompt.findFirst.mockResolvedValue({ id: "p-user", source: "user" });
    prisma.promptRun.count.mockResolvedValue(0);

    const { DELETE } = await import("../route");
    const res = await DELETE(jsonRequest("DELETE"), routeContext({ id: "biz-1", promptId: "p-user" }));

    expect(res.status).toBe(200);
    expect(prisma.prompt.delete).toHaveBeenCalledWith({ where: { id: "p-user" } });
    expect(prisma.prompt.update).not.toHaveBeenCalled();
  });

  it("archives a user-source prompt that has run history (preserves PromptRun)", async () => {
    prisma.prompt.findFirst.mockResolvedValue({ id: "p-user", source: "user" });
    prisma.promptRun.count.mockResolvedValue(5);

    const { DELETE } = await import("../route");
    const res = await DELETE(jsonRequest("DELETE"), routeContext({ id: "biz-1", promptId: "p-user" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.archived).toBe(true);
    expect(prisma.prompt.update).toHaveBeenCalledWith({ where: { id: "p-user" }, data: { status: "ARCHIVED" } });
    expect(prisma.prompt.delete).not.toHaveBeenCalled();
  });

  it("returns 403 when trying to delete a generated-source prompt", async () => {
    prisma.prompt.findFirst.mockResolvedValue({ id: "p-gen", source: "generated" });

    const { DELETE } = await import("../route");
    const res = await DELETE(jsonRequest("DELETE"), routeContext({ id: "biz-1", promptId: "p-gen" }));

    expect(res.status).toBe(403);
    expect(prisma.prompt.delete).not.toHaveBeenCalled();
    expect(prisma.prompt.update).not.toHaveBeenCalled();
  });

  it("returns 404 when promptId does not belong to the business (IDOR guard)", async () => {
    prisma.prompt.findFirst.mockResolvedValue(null);

    const { DELETE } = await import("../route");
    const res = await DELETE(jsonRequest("DELETE"), routeContext({ id: "biz-1", promptId: "p-on-other-biz" }));

    expect(res.status).toBe(404);
    expect(prisma.prompt.delete).not.toHaveBeenCalled();
  });
});
