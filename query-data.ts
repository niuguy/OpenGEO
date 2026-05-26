import { prisma } from "./src/lib/prisma";

// Helper to convert BigInt to regular numbers
function replacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value;
}

async function main() {
  try {
    // Query 1: PromptRun counts by status for demo-woking-dentist
    const statusCounts = await prisma.$queryRaw`
      SELECT pr.status, COUNT(*) as count 
      FROM "PromptRun" pr 
      JOIN "Prompt" p ON pr."promptId" = p.id 
      WHERE p."businessId" = 'demo-woking-dentist' 
      GROUP BY pr.status 
      ORDER BY pr.status
    `;
    console.log('=== PromptRun Status Counts for demo-woking-dentist ===');
    console.log(JSON.stringify(statusCounts, replacer, 2));

    // Query 2: Latest VisibilitySnapshot metrics
    const latestSnapshot = await prisma.visibilitySnapshot.findFirst({
      where: { businessId: 'demo-woking-dentist' },
      orderBy: { createdAt: 'desc' },
      select: {
        visibilityScore: true,
        shareOfVoice: true,
        recommendationConsistency: true,
        reliabilityLabel: true,
        topCompetitorDisplacement: true
      }
    });
    console.log('\n=== Latest VisibilitySnapshot Metrics ===');
    console.log(JSON.stringify(latestSnapshot, replacer, 2));

    // Query 3: SemanticAttribute total and top 8
    const semanticTotal = await prisma.semanticAttribute.count();
    console.log('\n=== Total SemanticAttribute Count ===');
    console.log({ total: semanticTotal });

    const topAttributes = await prisma.$queryRaw`
      SELECT label, COUNT(*) as count 
      FROM "SemanticAttribute" 
      GROUP BY label 
      ORDER BY count DESC 
      LIMIT 8
    `;
    console.log('\n=== Top 8 SemanticAttribute Labels ===');
    console.log(JSON.stringify(topAttributes, replacer, 2));

    // Query 4: ReferenceSignal total and breakdown
    const refSignalTotal = await prisma.referenceSignal.count();
    console.log('\n=== Total ReferenceSignal Count ===');
    console.log({ total: refSignalTotal });

    const sourceBreakdown = await prisma.$queryRaw`
      SELECT "sourceType", COUNT(*) as count 
      FROM "ReferenceSignal" 
      GROUP BY "sourceType" 
      ORDER BY count DESC
    `;
    console.log('\n=== ReferenceSignal by Source Type ===');
    console.log(JSON.stringify(sourceBreakdown, replacer, 2));

    // Query 5: Competitor-only PromptRuns
    const competitorOnly = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT er."promptRunId") as count
      FROM "ExtractionResult" er
      WHERE er."targetAppears" = false
      AND EXISTS (
        SELECT 1 FROM "MentionedBusiness" mb
        WHERE mb."extractionResultId" = er.id
      )
    `;
    console.log('\n=== PromptRuns where targetAppears=false and competitors mentioned ===');
    console.log(JSON.stringify(competitorOnly, replacer, 2));

  } catch (error) {
    console.error('Query error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
