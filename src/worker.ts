import { Worker } from "bullmq";
import {
  getRedisConnection,
  getMonitoringSweepQueue,
  PROMPT_RUN_QUEUE,
  MONITORING_SWEEP_QUEUE,
  type PromptRunJob,
  type MonitoringSweepJob
} from "./lib/jobs";
import { prisma } from "./lib/prisma";
import { processPromptRun } from "./lib/process-prompt-job";
import { runMonitoringSweep } from "./lib/monitoring";
import { flushLangfuse } from "./lib/observability/langfuse";

const promptWorker = new Worker<PromptRunJob>(
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

const monitoringWorker = new Worker<MonitoringSweepJob>(
  MONITORING_SWEEP_QUEUE,
  async () => {
    const result = await runMonitoringSweep();
    if (result.queued > 0) {
      console.log(`Monitoring sweep: queued ${result.queued} runs for ${result.businesses.length} businesses`);
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 1
  }
);

promptWorker.on("completed", (job) => {
  console.log(`Completed prompt run job ${job.id}`);
});

promptWorker.on("failed", (job, error) => {
  console.error(`Prompt run job ${job?.id ?? "unknown"} failed`, error);
});

monitoringWorker.on("failed", (job, error) => {
  console.error(`Monitoring sweep job ${job?.id ?? "unknown"} failed`, error);
});

// Schedule monitoring sweep every hour
const sweepQueue = getMonitoringSweepQueue();
sweepQueue
  .add("sweep", {}, { repeat: { every: 60 * 60 * 1000 }, removeOnComplete: 5, removeOnFail: 5 })
  .then(() => console.log("Monitoring sweep scheduled (every 1h)"))
  .catch((err) => console.error("Failed to schedule monitoring sweep", err));

async function shutdown() {
  await promptWorker.close();
  await monitoringWorker.close();
  await flushLangfuse();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`Workers listening on ${PROMPT_RUN_QUEUE} and ${MONITORING_SWEEP_QUEUE}`);
