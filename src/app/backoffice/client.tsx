"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type BusinessItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  promptCount: number;
  hasData: boolean;
  snapshot: {
    visibilityScore: number;
    shareOfVoice: number;
    reliabilityScore: number;
    date: string;
  } | null;
};

type TrialStatus =
  | { step: "idle" }
  | { step: "creating" }
  | { step: "generating"; businessId: string; businessName: string }
  | { step: "running"; businessId: string; businessName: string; total: number; completed: number }
  | { step: "done"; businessId: string; businessName: string }
  | { step: "error"; message: string };

export function BackofficeClient({ businesses }: { businesses: BusinessItem[] }) {
  const router = useRouter();
  const [trial, setTrial] = useState<TrialStatus>({ step: "idle" });

  async function startTrial(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const location = String(formData.get("location") || "").trim();
    const websiteUrl = String(formData.get("websiteUrl") || "").trim();
    const competitors = String(formData.get("competitors") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const targetAttributes = String(formData.get("targetAttributes") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!name || !category || !location || !websiteUrl) {
      setTrial({ step: "error", message: "Fill in all required fields." });
      return;
    }

    setTrial({ step: "creating" });

    const createRes = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, location, websiteUrl, competitors, targetAttributes }),
    });

    if (!createRes.ok) {
      setTrial({ step: "error", message: "Failed to create business." });
      return;
    }

    const { business } = (await createRes.json()) as { business: { id: string } };

    setTrial({ step: "generating", businessId: business.id, businessName: name });

    setTrial({
      step: "running",
      businessId: business.id,
      businessName: name,
      total: 0,
      completed: 0,
    });

    const runRes = await fetch(`/api/businesses/${business.id}/run-prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "direct", providers: ["chatgpt"], activateDrafts: true }),
    });

    if (!runRes.ok) {
      const data = (await runRes.json().catch(() => ({}))) as { error?: string };
      setTrial({ step: "error", message: data.error || "Audit run failed." });
      return;
    }

    const runData = (await runRes.json()) as { completed: number };
    setTrial({
      step: "done",
      businessId: business.id,
      businessName: name,
    });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Backoffice</h1>
          <p className="mt-1 text-sm text-muted">
            Create trial audits for prospects and generate PDF reports.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-accent hover:underline"
        >
          Back to site
        </Link>
      </div>

      {/* New trial audit form */}
      <section className="mt-8 rounded-lg border border-line bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">New trial audit</h2>
        <p className="mt-1 text-sm text-muted">
          Enter the prospect's business details. This will create the business, generate prompts, and
          run a full audit. Takes 1-3 minutes depending on prompt count.
        </p>

        {trial.step === "done" ? (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              Audit complete for {trial.businessName}.
            </p>
            <div className="mt-3 flex gap-3">
              <a
                href={`/api/businesses/${trial.businessId}/report.pdf`}
                download
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Download PDF
              </a>
              <Link
                href={`/businesses/${trial.businessId}`}
                className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-panel"
              >
                View dashboard
              </Link>
              <button
                onClick={() => setTrial({ step: "idle" })}
                className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-panel"
              >
                New audit
              </button>
            </div>
          </div>
        ) : trial.step !== "idle" && trial.step !== "error" ? (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-blue-800">
                {trial.step === "creating" && "Creating business..."}
                {trial.step === "generating" && `Generated prompts for ${trial.businessName}...`}
                {trial.step === "running" && `Running audit for ${trial.businessName}... This may take 1-3 minutes.`}
              </p>
            </div>
          </div>
        ) : (
          <form action={startTrial} className="mt-4">
            {trial.step === "error" && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {trial.message}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-ink">
                Business name *
                <input
                  name="name"
                  required
                  placeholder="e.g. Bright Smile Dental"
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-ink">
                Category *
                <input
                  name="category"
                  required
                  placeholder="e.g. dentist, accountant, solicitor"
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-ink">
                Location *
                <input
                  name="location"
                  required
                  placeholder="e.g. Manchester, UK"
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-ink">
                Website URL *
                <input
                  name="websiteUrl"
                  type="url"
                  required
                  placeholder="https://example.co.uk"
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-ink">
                Competitors (one per line)
                <textarea
                  name="competitors"
                  rows={3}
                  placeholder={"Competitor One\nCompetitor Two\nCompetitor Three"}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-ink">
                Target attributes (one per line)
                <textarea
                  name="targetAttributes"
                  rows={3}
                  placeholder={"e.g. same-day appointments\ne.g. free consultation"}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Create & run audit
            </button>
          </form>
        )}
      </section>

      {/* Existing businesses list */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">All businesses</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-panel text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-right">Prompts</th>
                <th className="px-4 py-3 font-medium text-right">Visibility</th>
                <th className="px-4 py-3 font-medium text-right">SoV</th>
                <th className="px-4 py-3 font-medium">Last audit</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No businesses yet. Create a trial audit above.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                    <td className="px-4 py-3 font-medium text-ink">{b.name}</td>
                    <td className="px-4 py-3 text-muted">{b.category}</td>
                    <td className="px-4 py-3 text-muted">{b.location}</td>
                    <td className="px-4 py-3 text-right text-muted">{b.promptCount}</td>
                    <td className="px-4 py-3 text-right">
                      {b.snapshot ? (
                        <span className="font-medium text-ink">{b.snapshot.visibilityScore}%</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.snapshot ? (
                        <span className="font-medium text-ink">{b.snapshot.shareOfVoice}%</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {b.snapshot?.date ?? "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {b.hasData && (
                          <a
                            href={`/api/businesses/${b.id}/report.pdf`}
                            download
                            className="rounded border border-line px-2 py-1 text-xs font-medium text-accent hover:bg-panel"
                          >
                            PDF
                          </a>
                        )}
                        <Link
                          href={`/businesses/${b.id}?manage`}
                          className="rounded border border-line px-2 py-1 text-xs font-medium text-ink hover:bg-panel"
                        >
                          Manage
                        </Link>
                      </div>
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
