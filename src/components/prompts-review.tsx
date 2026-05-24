"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui-extras";

type PromptStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ReviewablePrompt = {
  id: string;
  text: string;
  clusterIntent: string;
  status: PromptStatus;
  source: string;
};

type Props = {
  businessId: string;
  initialPrompts: ReviewablePrompt[];
};

export function PromptsReview({ businessId, initialPrompts }: Props) {
  const router = useRouter();
  const [prompts, setPrompts] = useState<ReviewablePrompt[]>(initialPrompts);
  const [customText, setCustomText] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const grouped = useMemo(() => groupByIntent(prompts), [prompts]);
  const activeCount = prompts.filter((p) => p.status === "ACTIVE").length;

  async function toggle(prompt: ReviewablePrompt) {
    const next: PromptStatus = prompt.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    setPrompts((current) =>
      current.map((p) => (p.id === prompt.id ? { ...p, status: next } : p))
    );

    const res = await fetch(`/api/businesses/${businessId}/prompts/${prompt.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next })
    });

    if (!res.ok) {
      // Roll back optimistic update on failure.
      setPrompts((current) =>
        current.map((p) => (p.id === prompt.id ? { ...p, status: prompt.status } : p))
      );
    }
  }

  async function addCustom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addBusy) return;
    setAddBusy(true);
    setAddError(null);

    const res = await fetch(`/api/businesses/${businessId}/prompts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: customText })
    });

    setAddBusy(false);

    if (res.status === 409) {
      const body = (await res.json()) as { existingPromptId?: string };
      setAddError(
        body.existingPromptId
          ? "A similar prompt already exists in this list."
          : "This prompt is a duplicate."
      );
      return;
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setAddError(body.error ?? "Could not add prompt");
      return;
    }

    const body = (await res.json()) as { prompt: ReviewablePrompt };
    setPrompts((current) => [...current, body.prompt]);
    setCustomText("");
  }

  async function removeCustom(prompt: ReviewablePrompt) {
    const previous = prompts;
    setPrompts((current) => current.filter((p) => p.id !== prompt.id));

    const res = await fetch(`/api/businesses/${businessId}/prompts/${prompt.id}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      setPrompts(previous);
    }
  }

  async function startAudit() {
    if (startBusy || activeCount === 0) return;
    setStartBusy(true);
    setStartError(null);

    const res = await fetch(`/api/businesses/${businessId}/run-prompts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "queue" })
    });

    if (!res.ok) {
      setStartBusy(false);
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStartError(body.error ?? "Could not start the audit");
      return;
    }

    router.push(`/businesses/${businessId}`);
  }

  return (
    <div className="space-y-8">
      {grouped.map(({ intent, items }) => (
        <section key={intent} className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            {intent} <span className="ml-2 normal-case text-xs font-normal">({items.length})</span>
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((prompt) => (
              <li key={prompt.id} className="flex items-start gap-4 py-3">
                <input
                  type="checkbox"
                  checked={prompt.status === "ACTIVE"}
                  onChange={() => toggle(prompt)}
                  className="mt-1 h-4 w-4 cursor-pointer"
                  aria-label={`Toggle prompt: ${prompt.text}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={prompt.status === "ACTIVE" ? "text-ink" : "text-muted line-through decoration-1"}>
                    {prompt.text}
                  </p>
                  {prompt.source === "user" ? (
                    <Badge variant="accent" className="mt-1">your prompt</Badge>
                  ) : null}
                </div>
                {prompt.source === "user" ? (
                  <button
                    type="button"
                    onClick={() => removeCustom(prompt)}
                    className="focus-ring text-xs text-muted hover:text-red-700"
                    aria-label={`Delete custom prompt: ${prompt.text}`}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-lg border border-dashed border-line bg-panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Add your own prompt</h2>
        <p className="mt-1 text-sm text-muted">
          Type something your clients&apos; customers actually ask. Example: &ldquo;best gentle dentist
          for kids in Woking&rdquo;.
        </p>
        <form onSubmit={addCustom} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="best dentist near me for nervous patients"
            minLength={8}
            maxLength={500}
            required
            className="focus-ring flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addBusy || customText.trim().length < 8}
            className="focus-ring rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {addBusy ? "Adding..." : "Add prompt"}
          </button>
        </form>
        {addError ? <p className="mt-2 text-sm text-red-700">{addError}</p> : null}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            {activeCount} of {prompts.length} prompts active
          </p>
          <button
            type="button"
            onClick={startAudit}
            disabled={startBusy || activeCount === 0}
            className="focus-ring rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {startBusy ? "Starting..." : `Start audit (${activeCount})`}
          </button>
        </div>
        {startError ? <p className="mt-2 text-sm text-red-700">{startError}</p> : null}
      </div>
    </div>
  );
}

function groupByIntent(prompts: ReviewablePrompt[]) {
  const order: string[] = [];
  const map = new Map<string, ReviewablePrompt[]>();
  for (const p of prompts) {
    const key = humanIntent(p.clusterIntent);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(p);
  }
  return order.map((intent) => ({ intent, items: map.get(intent)! }));
}

function humanIntent(clusterIntent: string) {
  if (clusterIntent === "user-custom") return "Your prompts";
  return clusterIntent
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
