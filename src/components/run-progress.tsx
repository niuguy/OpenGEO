"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "./ui-extras";

type RunStatus = {
  hasRuns: boolean;
  evaluationRunId: string | null;
  startedAt: string | null;
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  draftPrompts: number;
  activePrompts: number;
};

const ACTIVE_POLL_MS = 2500;
const IDLE_POLL_MS = 8000;

export function RunProgress({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [justFinished, setJustFinished] = useState(false);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/businesses/${businessId}/run-status`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`run-status ${response.status}`);
        }
        const data = (await response.json()) as RunStatus;
        if (cancelled) {
          return;
        }
        setStatus(data);

        const active = data.pending + data.running > 0;
        if (wasActiveRef.current && !active) {
          // Run just drained: pull fresh server-rendered metrics into the page.
          setJustFinished(true);
          router.refresh();
        }
        wasActiveRef.current = active;
        timer = setTimeout(poll, active ? ACTIVE_POLL_MS : IDLE_POLL_MS);
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, IDLE_POLL_MS);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [businessId, router]);

  if (!status) {
    return null;
  }

  const active = status.pending + status.running > 0;
  const done = status.completed + status.failed;
  const waitingForWorker = active && status.running === 0;

  if (active) {
    return (
      <section className="mt-6 rounded-lg border border-accent/30 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
            <p className="text-sm font-semibold text-ink">
              AI sampling in progress
            </p>
          </div>
          <p className="text-sm text-muted">
            {done} of {status.total} samples
            {status.failed > 0 ? ` · ${status.failed} failed` : ""}
          </p>
        </div>
        <ProgressBar
          value={status.total > 0 ? Math.round((done / status.total) * 100) : 0}
          className="mt-3"
        />
        <p className="mt-3 text-xs leading-5 text-muted">
          {waitingForWorker
            ? "Jobs are queued and waiting for the background worker. If nothing moves, make sure the worker is running (docker compose worker service or `pnpm worker`)."
            : `${status.running} running · ${status.pending} waiting in queue. The report below updates automatically when sampling finishes.`}
        </p>
      </section>
    );
  }

  if (justFinished) {
    return (
      <section className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Sampling complete — {status.completed} samples collected
        {status.failed > 0 ? `, ${status.failed} failed` : ""}. The report below
        reflects the new data.
      </section>
    );
  }

  if (!status.hasRuns) {
    return (
      <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">No AI samples yet — this report is empty.</p>
        <p className="mt-1 leading-6">
          {status.draftPrompts > 0 ? (
            <>
              {status.draftPrompts} generated prompts are awaiting review.{" "}
              <Link
                href={`/businesses/${businessId}/prompts`}
                className="font-medium underline"
              >
                Review and approve the prompts
              </Link>
              , then start a run from “Update Report” below.
            </>
          ) : status.activePrompts > 0 ? (
            <>
              {status.activePrompts} prompts are ready. Start a run from “Update
              Report” below to collect the first AI samples.
            </>
          ) : (
            <>Generate prompts first, then run them to fill this report.</>
          )}
        </p>
      </section>
    );
  }

  return null;
}
