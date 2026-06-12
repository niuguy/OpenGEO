"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProgressBar } from "./ui-extras";

type Props = {
  businessId: string;
  monitoringEnabled: boolean;
  monitoringIntervalDays: number;
  alertEmail: string | null;
};

export function DashboardActions({ businessId, monitoringEnabled, monitoringIntervalDays, alertEmail: initialAlertEmail }: Props) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [monitoring, setMonitoring] = useState(monitoringEnabled);
  const [intervalDays, setIntervalDays] = useState(monitoringIntervalDays);
  const [alertEmail, setAlertEmail] = useState(initialAlertEmail ?? "");
  const [monitoringStatus, setMonitoringStatus] = useState<"idle" | "saving">("idle");

  async function generatePrompts() {
    setStatus("loading");
    setMessage(
      "Analyzing category and location to generate diversified local-intent prompts...",
    );
    const response = await fetch(
      `/api/businesses/${businessId}/generate-prompts`,
      { method: "POST" },
    );

    if (!response.ok) {
      setStatus("error");
      setMessage(
        "Could not generate prompts. Ensure the business category is valid.",
      );
      return;
    }

    setStatus("success");
    setMessage("Prompts generated successfully.");
    router.refresh();
  }

  async function runDirect() {
    setStatus("loading");
    setMessage(
      "Executing live AI sampling. This may take up to 60 seconds depending on provider latency.",
    );
    const response = await fetch(`/api/businesses/${businessId}/run-prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "direct",
        openAiApiKey: apiKey || undefined,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setStatus("error");
      setMessage(
        data.error ||
          "Prompt run failed. Check your API key or .env configuration.",
      );
      return;
    }

    setStatus("success");
    setMessage("Sampling complete. Dashboard results have been updated.");
    setApiKey("");
    router.refresh();
  }

  async function saveMonitoring(enabled: boolean, days: number, email?: string) {
    setMonitoringStatus("saving");
    await fetch(`/api/businesses/${businessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monitoringEnabled: enabled,
        monitoringIntervalDays: days,
        alertEmail: (email ?? alertEmail) || null
      })
    });
    setMonitoring(enabled);
    setMonitoringStatus("idle");
    router.refresh();
  }

  async function runQueued() {
    setStatus("loading");
    setMessage("Prompt runs added to the background queue.");
    const response = await fetch(`/api/businesses/${businessId}/run-prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "queue" }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setStatus("error");
      setMessage(data.error || "Could not queue prompt runs.");
      return;
    }

    setStatus("success");
    setMessage(
      "Runs queued — live progress appears at the top of this report while the worker processes them.",
    );
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Update Report</h2>
        {status === "loading" && (
          <div className="h-2 w-2 animate-ping rounded-full bg-accent" />
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">
        Refresh your visibility data by running a new set of AI samples. This
        will analyze current results across ChatGPT, Gemini, and Google AI
        Overview.
      </p>

      {status === "loading" && (
        <ProgressBar value={45} className="mt-4 animate-pulse" />
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={runDirect}
          disabled={status === "loading"}
          className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading" ? "Refreshing..." : "Refresh Live Data"}
        </button>
        <button
          onClick={runQueued}
          disabled={status === "loading"}
          className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-panel disabled:opacity-50"
        >
          Queue Background Update
        </button>
        <button
          onClick={generatePrompts}
          disabled={status === "loading"}
          className="focus-ring rounded-md border border-line bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-panel disabled:opacity-50"
        >
          Reset Prompt Set
        </button>
      </div>

      <details className="mt-6 border-t border-line pt-4">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
          Advanced Configuration
        </summary>
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted">
            OpenAI API Key Override
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              type="password"
              autoComplete="off"
              placeholder="sk-..."
              className="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <p className="mt-2 text-[10px] text-muted leading-relaxed">
            By default, we use our managed infrastructure. You can provide your
            own key to override local rate limits or use custom models.
          </p>
        </div>
      </details>

      {message ? (
        <div
          className={`mt-4 rounded-md border p-3 text-sm ${
            status === "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : status === "success"
                ? "border-green-100 bg-green-50 text-green-700"
                : "border-blue-100 bg-blue-50 text-muted"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Scheduled monitoring</p>
            <p className="mt-0.5 text-xs text-muted">
              Automatically re-run prompts on a recurring interval and alert on visibility changes ≥10 points.
            </p>
          </div>
          <button
            onClick={() => saveMonitoring(!monitoring, intervalDays)}
            disabled={monitoringStatus === "saving"}
            className={`focus-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
              monitoring ? "bg-accent" : "bg-line"
            }`}
            role="switch"
            aria-checked={monitoring}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                monitoring ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {monitoring && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted">
                Every
                <select
                  value={intervalDays}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    setIntervalDays(days);
                    saveMonitoring(true, days);
                  }}
                  className="focus-ring mx-2 rounded-md border border-line px-2 py-1 text-xs text-ink"
                >
                  {[1, 3, 7, 14, 30].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? "day" : "days"}
                    </option>
                  ))}
                </select>
              </label>
              {monitoringStatus === "saving" && (
                <span className="text-xs text-muted">Saving…</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="Alert email (optional)"
                className="focus-ring flex-1 rounded-md border border-line px-3 py-1.5 text-xs text-ink"
              />
              <button
                onClick={() => saveMonitoring(true, intervalDays, alertEmail)}
                disabled={monitoringStatus === "saving"}
                className="focus-ring rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium hover:bg-panel disabled:opacity-50"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-muted">
              Get emailed when visibility changes by 10+ points. Requires SMTP config in .env.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
