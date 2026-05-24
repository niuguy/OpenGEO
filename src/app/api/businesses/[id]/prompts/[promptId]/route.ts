import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; promptId: string }>;
};

type PatchBody = { status?: "DRAFT" | "ACTIVE" };

export async function PATCH(request: Request, context: RouteContext) {
  const { id, promptId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as PatchBody;

  if (body.status !== "DRAFT" && body.status !== "ACTIVE") {
    return NextResponse.json({ error: "status must be DRAFT or ACTIVE" }, { status: 400 });
  }

  // IDOR guard: composite where clause means cross-business promptId hits 0 rows
  // and 404s, rather than mutating someone else's prompt.
  const result = await prisma.prompt.updateMany({
    where: { id: promptId, businessId: id },
    data: { status: body.status }
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  return NextResponse.json({ prompt });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, promptId } = await context.params;

  const prompt = await prisma.prompt.findFirst({
    where: { id: promptId, businessId: id },
    select: { id: true, source: true }
  });

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  if (prompt.source !== "user") {
    return NextResponse.json({ error: "Generated prompts cannot be deleted" }, { status: 403 });
  }

  // Preserve PromptRun history: if the user prompt already produced runs, archive
  // instead of hard-deleting. Otherwise the cascade would wipe historical
  // metrics. From the UI it disappears either way.
  const runCount = await prisma.promptRun.count({ where: { promptId } });
  if (runCount > 0) {
    await prisma.prompt.update({ where: { id: promptId }, data: { status: "ARCHIVED" } });
    return NextResponse.json({ ok: true, archived: true });
  }

  await prisma.prompt.delete({ where: { id: promptId } });
  return NextResponse.json({ ok: true, archived: false });
}
