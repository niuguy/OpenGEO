import { Worker } from "bullmq";
import { getRedisConnection, PROMPT_RUN_QUEUE, type PromptRunJob } from "./lib/jobs";
import { prisma } from "./lib/prisma";
import { processPromptRun } from "./lib/process-prompt-job";
import { flushLangfuse } from "./lib/observability/langfuse";

const worker = new Worker<PromptRunJob>(
  PROMPT_RUN_QUEUE,
  async (job) => {
    return processPromptRun(job.data.promptId, {
      evaluationRunId: job.data.evaluationRunId,
      sampleIndex: job.data.sampleIndex,
      provider: job.data.provider
    });
  },
  {
    connection: getRedisConnection(),
    concurrency: 2
  }
);

worker.on("completed", (job) => {
  console.log(`Completed prompt run job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Prompt run job ${job?.id ?? "unknown"} failed`, error);
});

async function shutdown() {
  await worker.close();
  await flushLangfuse();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`Worker listening on ${PROMPT_RUN_QUEUE}`);
