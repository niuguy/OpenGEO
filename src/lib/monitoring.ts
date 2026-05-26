import { prisma } from "./prisma";
import { getPromptRunQueue } from "./jobs";
import { randomUUID } from "crypto";
import { parseObservationProviders } from "./ai/providers";

const ALERT_THRESHOLD_POINTS = 10;

export async function runMonitoringSweep(): Promise<{ queued: number; businesses: string[] }> {
  const now = new Date();
  const businesses = await prisma.business.findMany({
    where: {
      monitoringEnabled: true,
      OR: [
        { lastMonitoredAt: null },
        {
          lastMonitoredAt: {
            // Due if lastMonitoredAt + intervalDays <= now
            lt: new Date(now.getTime() - 0) // placeholder — filtered in JS below
          }
        }
      ]
    },
    include: {
      prompts: { where: { status: "ACTIVE" }, select: { id: true } }
    }
  });

  // Filter precisely by interval since Prisma can't reference a row's own column in a where clause
  const due = businesses.filter((b) => {
    if (!b.lastMonitoredAt) return true;
    const intervalMs = b.monitoringIntervalDays * 24 * 60 * 60 * 1000;
    return now.getTime() - b.lastMonitoredAt.getTime() >= intervalMs;
  });

  if (due.length === 0) {
    return { queued: 0, businesses: [] };
  }

  const queue = getPromptRunQueue();
  const providers = parseObservationProviders(process.env.OBSERVATION_PROVIDERS, ["chatgpt"]);
  let totalQueued = 0;

  for (const business of due) {
    if (business.prompts.length === 0) continue;

    const evaluationRunId = randomUUID();
    const jobs = providers.flatMap((provider) =>
      business.prompts.map((prompt) =>
        queue.add(
          "run-prompt",
          { promptId: prompt.id, evaluationRunId, sampleIndex: 0, provider },
          { attempts: 2, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100, removeOnFail: 100 }
        )
      )
    );
    await Promise.all(jobs);
    totalQueued += jobs.length;

    await prisma.business.update({
      where: { id: business.id },
      data: { lastMonitoredAt: now }
    });
  }

  return { queued: totalQueued, businesses: due.map((b) => b.id) };
}

export { ALERT_THRESHOLD_POINTS };
