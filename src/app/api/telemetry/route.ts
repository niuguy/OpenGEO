import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const totals = await prisma.telemetryEvent.groupBy({
    by: ["eventName"],
    _count: {
      eventName: true
    },
    orderBy: {
      _count: {
        eventName: "desc"
      }
    }
  });

  const recent = await prisma.telemetryEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 25
  });

  return NextResponse.json({ totals, recent });
}
