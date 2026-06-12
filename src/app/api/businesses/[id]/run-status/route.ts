import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPromptRunQueue } from "@/lib/jobs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Lightweight polling endpoint for the report page: progress of the latest
// evaluation run plus prompt review state. Counts only — never returns
// PromptRun rows (seed is a BigInt and would break JSON serialization).
//
// PromptRun rows are created when the worker *starts* a job, so jobs still
// waiting in Redis have no row yet. The queue is consulted for the true
// pending count; otherwise a fresh queue of 31 jobs would report total=0
// and grow as the worker picks them up — and a stopped worker would show
// nothing at all.
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const [prompts, promptCounts] = await Promise.all([
    prisma.prompt.findMany({ where: { businessId: id }, select: { id: true } }),
    prisma.prompt.groupBy({
      by: ["status"],
      where: { businessId: id },
      _count: { _all: true }
    })
  ]);

  const promptIds = new Set(prompts.map((prompt) => prompt.id));
  const promptsByStatus = Object.fromEntries(
    promptCounts.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  const base = {
    draftPrompts: promptsByStatus.DRAFT ?? 0,
    activePrompts: promptsByStatus.ACTIVE ?? 0
  };

  let queuedPending = 0;
  let queuedEvaluationRunId: string | null = null;
  try {
    const queue = getPromptRunQueue();
    const waitingJobs = await queue.getJobs(["waiting", "delayed", "prioritized"]);
    for (const job of waitingJobs) {
      if (job?.data?.promptId && promptIds.has(job.data.promptId)) {
        queuedPending += 1;
        queuedEvaluationRunId = job.data.evaluationRunId ?? queuedEvaluationRunId;
      }
    }
  } catch {
    // Redis unavailable — fall back to database-only counts.
  }

  const latestRun = await prisma.promptRun.findFirst({
    where: queuedEvaluationRunId
      ? { evaluationRunId: queuedEvaluationRunId }
      : { prompt: { businessId: id } },
    orderBy: { startedAt: "desc" },
    select: { evaluationRunId: true, startedAt: true }
  });

  const evaluationRunId = queuedEvaluationRunId ?? latestRun?.evaluationRunId ?? null;

  if (!latestRun && !queuedEvaluationRunId) {
    return NextResponse.json({
      ...base,
      hasRuns: false,
      evaluationRunId: null,
      startedAt: null,
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0
    });
  }

  // Pre-evaluationRunId rows (older data) fall back to all runs for the business.
  const runScope = evaluationRunId
    ? { evaluationRunId }
    : { prompt: { businessId: id } };

  const runCounts = await prisma.promptRun.groupBy({
    by: ["status"],
    where: runScope,
    _count: { _all: true }
  });

  const byStatus = Object.fromEntries(
    runCounts.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  const pending = (byStatus.PENDING ?? 0) + queuedPending;
  const running = byStatus.RUNNING ?? 0;
  const completed = byStatus.COMPLETED ?? 0;
  const failed = byStatus.FAILED ?? 0;

  return NextResponse.json({
    ...base,
    hasRuns: true,
    evaluationRunId,
    startedAt: latestRun?.startedAt.toISOString() ?? null,
    total: pending + running + completed + failed,
    pending,
    running,
    completed,
    failed
  });
}
