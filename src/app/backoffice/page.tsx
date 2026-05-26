import { prisma } from "@/lib/prisma";
import { BackofficeClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BackofficePage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { prompts: true, snapshots: true } },
      snapshots: {
        where: { provider: "chatgpt" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          visibilityScore: true,
          shareOfVoice: true,
          reliabilityScore: true,
          createdAt: true,
        },
      },
    },
  });

  const items = businesses.map((b) => {
    const snap = b.snapshots[0];
    return {
      id: b.id,
      name: b.name,
      category: b.category,
      location: b.location,
      promptCount: b._count.prompts,
      hasData: b._count.snapshots > 0,
      snapshot: snap
        ? {
            visibilityScore: Math.round(snap.visibilityScore),
            shareOfVoice: Math.round(snap.shareOfVoice),
            reliabilityScore: Math.round(snap.reliabilityScore),
            date: snap.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          }
        : null,
    };
  });

  return <BackofficeClient businesses={items} />;
}
