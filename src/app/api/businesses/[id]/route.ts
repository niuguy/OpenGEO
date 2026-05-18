import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      competitors: true,
      prompts: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json({ business });
}
