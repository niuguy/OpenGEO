"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  businessId: string;
};

export function DashboardActions({ businessId }: Props) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  async function generatePrompts() {
    setStatus("loading");
    setMessage("");
    const response = await fetch(`/api/businesses/${businessId}/generate-prompts`, { method: "POST" });

    if (!response.ok) {
      setStatus("error");
      setMessage("Could not generate prompts.");
      return;
    }

    setStatus("success");
    setMessage("Prompts generated.");
    router.refresh();
  }

  async function runDirect() {
    setStatus("loading");
    setMessage("Running prompts. This can take a minute for local audits.");
    const response = await fetch(`/api/businesses/${businessId}/run-prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "direct",
        openAiApiKey: apiKey || undefined
      })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setMessage(data.error || "Prompt run failed.");
      return;
    }

    setStatus("success");
    setMessage("Prompt runs completed.");
    setApiKey("");
    router.refresh();
  }

  async function runQueued() {
    setStatus("loading");
    setMessage("");
    const response = await fetch(`/api/businesses/${businessId}/run-prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "queue" })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setMessage(data.error || "Could not queue prompt runs.");
      return;
    }

    setStatus("success");
    setMessage("Prompt runs queued. Keep pnpm worker running.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-ink">Run verification</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Direct runs can use a request-only OpenAI key for ChatGPT and extraction. Gemini and Google AI Overview runs
        use local provider keys from your .env. Queued worker runs use configured local environment keys.
      </p>
      <label className="mt-4 block text-sm font-medium text-ink">
        OpenAI API key for direct run
        <input
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          type="password"
          autoComplete="off"
          placeholder="sk-..."
          className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={generatePrompts} className="focus-ring rounded-md border border-line bg-white px-3 py-2 text-sm font-medium">
          Generate prompts
        </button>
        <button onClick={runDirect} className="focus-ring rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
          Run direct
        </button>
        <button onClick={runQueued} className="focus-ring rounded-md border border-line bg-white px-3 py-2 text-sm font-medium">
          Queue worker run
        </button>
      </div>
      {message ? (
        <p className={`mt-3 text-sm ${status === "error" ? "text-red-700" : "text-muted"}`}>{message}</p>
      ) : null}
    </div>
  );
}
