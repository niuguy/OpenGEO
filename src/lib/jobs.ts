import { Queue } from "bullmq";
import IORedis from "ioredis";

export const PROMPT_RUN_QUEUE = "prompt-runs";

export type PromptRunJob = {
  promptId: string;
  evaluationRunId?: string;
  sampleIndex?: number;
  provider?: "chatgpt" | "gemini" | "google_ai_overview";
};

let connection: IORedis | null = null;
let queue: Queue<PromptRunJob> | null = null;

export function getRedisConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null
    });
  }

  return connection;
}

export function getPromptRunQueue() {
  if (!queue) {
    queue = new Queue<PromptRunJob>(PROMPT_RUN_QUEUE, {
      connection: getRedisConnection()
    });
  }

  return queue;
}
