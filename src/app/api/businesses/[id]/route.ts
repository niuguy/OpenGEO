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

type PatchBody = {
  monitoringEnabled?: boolean;
  monitoringIntervalDays?: number;
  alertEmail?: string | null;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as PatchBody;

  const data: Partial<{ monitoringEnabled: boolean; monitoringIntervalDays: number; alertEmail: string | null }> = {};

  if (typeof body.monitoringEnabled === "boolean") {
    data.monitoringEnabled = body.monitoringEnabled;
  }

  if (typeof body.monitoringIntervalDays === "number") {
    const interval = Math.round(body.monitoringIntervalDays);
    if (interval < 1 || interval > 30) {
      return NextResponse.json({ error: "monitoringIntervalDays must be between 1 and 30" }, { status: 400 });
    }
    data.monitoringIntervalDays = interval;
  }

  if ("alertEmail" in body) {
    const email = body.alertEmail;
    if (email !== null && email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid alertEmail address" }, { status: 400 });
    }
    data.alertEmail = email ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const business = await prisma.business.update({
    where: { id },
    data
  });

  return NextResponse.json({ business });
}
