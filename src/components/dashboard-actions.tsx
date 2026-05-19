"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProgressBar } from "./ui-extras";

type Props = {
  businessId: string;
};

export function DashboardActions({ businessId }: Props) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [message, setMessage] = useState("");

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
      "Runs queued. Ensure the background 'pnpm worker' is running to process them.",
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
    </div>
  );
}
