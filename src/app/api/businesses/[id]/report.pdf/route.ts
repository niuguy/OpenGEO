import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { notFound } from "next/navigation";
import { getBusinessDashboard } from "@/lib/dashboard";
import { VisibilityReport, type ReportData } from "@/lib/report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const agencyName = searchParams.get("agencyName");
  const agencyWebsite = searchParams.get("agencyWebsite") ?? undefined;
  const dashboard = await getBusinessDashboard(id);

  if (!dashboard) {
    notFound();
  }

  const chatgptHistory = dashboard.snapshotHistory.find((s) => s.provider === "chatgpt") ?? dashboard.snapshotHistory[0];
  const snapshotHistory = (chatgptHistory?.points ?? []).map((p) => ({
    date: p.date,
    visibilityScore: p.visibilityScore,
    shareOfVoice: p.shareOfVoice,
    reliabilityScore: p.reliabilityScore
  }));

  const data: ReportData = {
    agency: agencyName ? { name: agencyName, website: agencyWebsite } : undefined,
    business: {
      name: dashboard.business.name,
      category: dashboard.business.category,
      location: dashboard.business.location
    },
    totals: dashboard.totals,
    comparison: dashboard.comparison,
    topAppearingPrompts: dashboard.topAppearingPrompts.map((r) => ({
      promptSamplingIntent: r.promptSamplingIntent,
      promptClusterIntent: r.promptClusterIntent,
      targetRank: r.targetRank,
      sentiment: r.sentiment
    })),
    competitorOnlyPrompts: dashboard.competitorOnlyPrompts.map((r) => ({
      promptSamplingIntent: r.promptSamplingIntent,
      promptClusterIntent: r.promptClusterIntent,
      mentionedBusinesses: r.mentionedBusinesses
    })),
    competitorGapReasons: dashboard.competitorGapReasons,
    semanticAttributes: dashboard.semanticAttributes,
    referenceSignals: dashboard.referenceSignals,
    providerBreakdown: dashboard.providerBreakdown.map((r) => ({
      provider: r.provider,
      label: r.label,
      completedRunCount: r.completedRunCount,
      visibilityScore: r.visibilityScore,
      recommendationRate: r.recommendationRate,
      shareOfVoice: r.shareOfVoice,
      averageRank: r.averageRank,
      consistency: r.consistency
    })),
    snapshotHistory,
    methodology: dashboard.methodology
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(VisibilityReport, { data }) as any);

  const slug = dashboard.business.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `nearbyai-visibility-${slug}.pdf`;

  const uint8 = new Uint8Array(buffer);

  return new Response(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(uint8.byteLength)
    }
  });
}

