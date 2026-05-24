import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { persistUserPrompt } from "@/lib/prompts/persist";
import { trackEvent } from "@/lib/telemetry";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { text?: unknown };

  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const result = await persistUserPrompt(id, body.text);

  if (!result.ok && result.reason === "validation") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  if (!result.ok && result.reason === "duplicate") {
    return NextResponse.json(
      { error: "A similar prompt already exists", existingPromptId: result.existingPromptId },
      { status: 409 }
    );
  }

  if (!result.ok) {
    return NextResponse.json({ error: "Could not add prompt" }, { status: 500 });
  }

  const userPromptCount = await prisma.prompt.count({
    where: { businessId: id, source: "user" }
  });
  await trackEvent("user_prompt_added", { businessId: id, userPromptCount });

  const prompt = await prisma.prompt.findUnique({ where: { id: result.promptId } });
  return NextResponse.json({ prompt }, { status: 201 });
}
