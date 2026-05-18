import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/telemetry";

const inquirySchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  agencyName: z.string().trim().optional(),
  message: z.string().trim().min(10)
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = inquirySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid inquiry payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const inquiry = await prisma.agencyInquiry.create({
    data: parsed.data
  });

  await trackEvent("agency_inquiry_created", {
    inquiryId: inquiry.id,
    hasAgencyName: Boolean(inquiry.agencyName)
  });

  return NextResponse.json({ inquiry }, { status: 201 });
}
