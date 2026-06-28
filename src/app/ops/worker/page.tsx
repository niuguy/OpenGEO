import Link from "next/link";
import type { JobType, Queue } from "bullmq";
import {
  getMonitoringSweepQueue,
  getPromptRunQueue,
  type MonitoringSweepJob,
  type PromptRunJob,
} from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui-extras";

export const dynamic = "force-dynamic";

const JOB_TYPES: JobType[] = [
  "waiting",
  "active",
  "delayed",
  "prioritized",
  "completed",
  "failed",
  "waiting-children",
];

type QueueJobRow = {
  id: string;
  name: string;
  state: string;
  data: string;
  attempts: string;
  createdAt: Date | null;
  processedAt: Date | null;
  finishedAt: Date | null;
  failedReason: string | null;
};

type QueueSnapshot = {
  ok: true;
  name: string;
  counts: Record<string, number>;
  workersCount: number;
  workers: Record<string, string>[];
  jobs: QueueJobRow[];
  repeatableJobs: { name: string; next: Date | null; pattern: string | null; every: string | null }[];
} | {
  ok: false;
  name: string;
  error: string;
};

function formatDate(value: Date | string | number | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatAge(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function summarizePromptJobData(data: PromptRunJob | MonitoringSweepJob | undefined) {
  if (!data || Object.keys(data).length === 0) {
    return "-";
  }

  if ("promptId" in data) {
    return [
      data.provider ?? "chatgpt",
      `sample ${data.sampleIndex ?? 0}`,
      data.evaluationRunId ? `run ${data.evaluationRunId.slice(0, 8)}` : null,
      `prompt ${data.promptId.slice(0, 8)}`,
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return JSON.stringify(data);
}

async function getQueueSnapshot<T extends PromptRunJob | MonitoringSweepJob>(
  name: string,
  queue: Queue<T>,
  includeRepeatableJobs = false
): Promise<QueueSnapshot> {
  try {
    const [counts, workersCount, workers, jobs, repeatableJobs] = await Promise.all([
      queue.getJobCounts(...JOB_TYPES),
      queue.getWorkersCount().catch(() => 0),
      queue.getWorkers().catch(() => [] as Record<string, string>[]),
      queue.getJobs(JOB_TYPES, 0, 24, false),
      includeRepeatableJobs
        ? queue.getRepeatableJobs(0, 10, false)
        : Promise.resolve([]),
    ]);

    const rows = await Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState().catch(() => "unknown");
        return {
          id: String(job.id ?? "-"),
          name: job.name,
          state,
          data: summarizePromptJobData(job.data),
          attempts: `${job.attemptsMade}/${job.opts.attempts ?? 1}`,
          createdAt: job.timestamp ? new Date(job.timestamp) : null,
          processedAt: job.processedOn ? new Date(job.processedOn) : null,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
          failedReason: job.failedReason ?? null,
        };
      })
    );

    return {
      ok: true,
      name,
      counts,
      workersCount,
      workers,
      jobs: rows,
      repeatableJobs: repeatableJobs.map((job) => ({
        name: job.name,
        next: job.next ? new Date(job.next) : null,
        pattern: job.pattern ?? null,
        every: job.every ?? null,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      name,
      error: errorMessage(error),
    };
  }
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function StatusBadge({ state }: { state: string }) {
  const active = state === "active" || state === "RUNNING";
  const failed = state === "failed" || state === "FAILED";
  const completed = state === "completed" || state === "COMPLETED";

  return (
    <Badge
      variant={active || failed ? "accent" : "default"}
      className={
        failed
          ? "border-red-200 bg-red-50 text-red-700"
          : completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : ""
      }
    >
      {state}
    </Badge>
  );
}

function QueuePanel({ snapshot }: { snapshot: QueueSnapshot }) {
  if (!snapshot.ok) {
    return (
      <section className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{snapshot.name}</h2>
          <Badge className="border-red-200 bg-red-50 text-red-700">Redis error</Badge>
        </div>
        <p className="mt-3 text-sm text-muted">{snapshot.error}</p>
      </section>
    );
  }

  const liveWork =
    (snapshot.counts.waiting ?? 0) +
    (snapshot.counts.active ?? 0) +
    (snapshot.counts.delayed ?? 0) +
    (snapshot.counts.prioritized ?? 0);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{snapshot.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {snapshot.workersCount} worker{snapshot.workersCount === 1 ? "" : "s"} connected
          </p>
        </div>
        <Badge variant={liveWork > 0 ? "accent" : "default"}>
          {liveWork > 0 ? `${liveWork} live` : "idle"}
        </Badge>
      </div>

      <div className="mt-5 grid overflow-hidden rounded-lg border border-line sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
        <MetricCell label="Waiting" value={snapshot.counts.waiting ?? 0} />
        <MetricCell label="Active" value={snapshot.counts.active ?? 0} />
        <MetricCell label="Delayed" value={snapshot.counts.delayed ?? 0} />
        <MetricCell label="Failed" value={snapshot.counts.failed ?? 0} />
      </div>

      {snapshot.repeatableJobs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink">Repeatable jobs</h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Schedule</th>
                  <th className="px-3 py-2 font-medium">Next run</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.repeatableJobs.map((job) => (
                  <tr key={`${job.name}-${job.next?.getTime() ?? "none"}`} className="border-t border-line">
                    <td className="px-3 py-2 text-ink">{job.name}</td>
                    <td className="px-3 py-2 text-muted">
                      {job.pattern ??
                        (job.every ? `Every ${Math.round(Number(job.every) / 60000)}m` : "-")}
                    </td>
                    <td className="px-3 py-2 text-muted">{formatDate(job.next)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-ink">Recent queue jobs</h3>
        <div className="mt-2 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Job</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Attempts</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Processed</th>
                <th className="px-3 py-2 font-medium">Finished</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.jobs.length === 0 ? (
                <tr>
                  <td className="px-3 py-5 text-muted" colSpan={7}>
                    No queue jobs found.
                  </td>
                </tr>
              ) : (
                snapshot.jobs.map((job) => (
                  <tr key={`${snapshot.name}-${job.id}`} className="border-t border-line align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium text-ink">{job.name}</p>
                      <p className="text-xs text-muted">{job.id}</p>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge state={job.state} />
                    </td>
                    <td className="max-w-xs px-3 py-2 text-muted">
                      <p className="truncate" title={job.data}>
                        {job.data}
                      </p>
                      {job.failedReason && (
                        <p className="mt-1 truncate text-xs text-red-700" title={job.failedReason}>
                          {job.failedReason}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">{job.attempts}</td>
                    <td className="px-3 py-2 text-muted">{formatDate(job.createdAt)}</td>
                    <td className="px-3 py-2 text-muted">{formatDate(job.processedAt)}</td>
                    <td className="px-3 py-2 text-muted">{formatDate(job.finishedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default async function WorkerStatusPage() {
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);
  const [promptQueue, monitoringQueue, runCounts, recentRuns, staleRuns] = await Promise.all([
    getQueueSnapshot("Prompt run queue", getPromptRunQueue()),
    getQueueSnapshot("Monitoring sweep queue", getMonitoringSweepQueue(), true),
    prisma.promptRun.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.promptRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        prompt: {
          select: {
            text: true,
            business: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.promptRun.findMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: staleCutoff },
      },
      orderBy: { startedAt: "asc" },
      take: 20,
      include: {
        prompt: {
          select: {
            business: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const dbCounts = Object.fromEntries(
    runCounts.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Worker Status</h1>
          <p className="mt-2 text-sm text-muted">
            BullMQ queue health, connected workers, and recent audit prompt runs.
          </p>
          <p className="mt-1 text-xs text-muted">Last refreshed: {formatDate(new Date())}</p>
        </div>
        <Link
          href="/ops/worker"
          className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-panel"
        >
          Refresh
        </Link>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CountCard label="DB running" value={dbCounts.RUNNING ?? 0} />
        <CountCard label="DB completed" value={dbCounts.COMPLETED ?? 0} />
        <CountCard label="DB failed" value={dbCounts.FAILED ?? 0} />
        <CountCard label="Stale running" value={staleRuns.length} />
      </section>

      {staleRuns.length > 0 && (
        <section className="mt-6 rounded-lg border border-red-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Stale running prompt runs</h2>
            <Badge className="border-red-200 bg-red-50 text-red-700">Needs attention</Badge>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">Business</th>
                  <th className="py-2 pr-3 font-medium">Provider</th>
                  <th className="py-2 pr-3 font-medium">Age</th>
                  <th className="py-2 pr-3 font-medium">Run</th>
                </tr>
              </thead>
              <tbody>
                {staleRuns.map((run) => (
                  <tr key={run.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3">
                      <Link href={`/businesses/${run.prompt.business.id}`} className="font-medium text-accent hover:underline">
                        {run.prompt.business.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-muted">{run.provider}</td>
                    <td className="py-2 pr-3 text-muted">{formatAge(run.startedAt)}</td>
                    <td className="py-2 pr-3 text-xs text-muted">{run.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6">
        <QueuePanel snapshot={promptQueue} />
        <QueuePanel snapshot={monitoringQueue} />
      </div>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Recent database runs</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">Sample</th>
                <th className="px-3 py-2 font-medium">Age</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Completed</th>
                <th className="px-3 py-2 font-medium">Prompt</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.length === 0 ? (
                <tr>
                  <td className="px-3 py-5 text-muted" colSpan={8}>
                    No prompt runs found.
                  </td>
                </tr>
              ) : (
                recentRuns.map((run) => (
                  <tr key={run.id} className="border-t border-line align-top">
                    <td className="px-3 py-2">
                      <Link href={`/businesses/${run.prompt.business.id}`} className="font-medium text-accent hover:underline">
                        {run.prompt.business.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted">{run.evaluationRunId?.slice(0, 8) ?? run.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge state={run.status} />
                      {run.error && (
                        <p className="mt-1 max-w-xs truncate text-xs text-red-700" title={run.error}>
                          {run.error}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">{run.provider}</td>
                    <td className="px-3 py-2 text-muted">{run.sampleIndex}</td>
                    <td className="px-3 py-2 text-muted">{formatAge(run.startedAt)}</td>
                    <td className="px-3 py-2 text-muted">{formatDate(run.startedAt)}</td>
                    <td className="px-3 py-2 text-muted">{formatDate(run.completedAt)}</td>
                    <td className="max-w-sm px-3 py-2 text-muted">
                      <p className="line-clamp-2" title={run.prompt.text}>
                        {run.prompt.text}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
