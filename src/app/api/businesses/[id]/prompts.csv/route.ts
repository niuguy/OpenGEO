import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const prompts = await prisma.prompt.findMany({
    where: { businessId: id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: {
      text: true,
      clusterId: true,
      clusterIntent: true,
      samplingBasis: true
    }
  });

  if (prompts.length === 0) {
    return new Response("No active prompts found", { status: 404 });
  }

  const headers = ["prompt_text", "cluster_id", "cluster_intent", "intent", "location_style", "specificity", "persona", "wording_style", "decision_mode"];

  const rows = prompts.map((p) => {
    const basis = (p.samplingBasis ?? {}) as Record<string, string>;
    return [
      // Strip the evidence request suffix — keep only the question itself
      p.text.split("\n\n")[0] ?? p.text,
      p.clusterId,
      p.clusterIntent,
      basis.intent ?? "",
      basis.locationStyle ?? "",
      basis.specificity ?? "",
      basis.persona ?? "",
      basis.wordingStyle ?? "",
      basis.decisionMode ?? ""
    ].map(csvEscape).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="nearbyai-prompts-${id}.csv"`
    }
  });
}
