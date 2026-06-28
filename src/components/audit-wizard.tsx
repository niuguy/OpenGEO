"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Adaptive guided intake (plan Phase 1). Three beats: seed a website/name, let
// the intake agent classify + pre-fill, then confirm. The pivotal "local vs
// national/public" fork is the first control on the confirm step and drives
// which fields render. This is Gate 1; the agent's suggestion is a starting
// point the user always edits.

type NonLocalKind = "org" | "saas" | "ecommerce" | "publisher" | "person" | "developer_tool";

const NON_LOCAL_KINDS: { value: NonLocalKind; label: string }[] = [
  { value: "org", label: "National brand / organisation" },
  { value: "saas", label: "SaaS / software product" },
  { value: "ecommerce", label: "E-commerce brand" },
  { value: "publisher", label: "Publisher / media" },
  { value: "developer_tool", label: "Developer tool" },
  { value: "person", label: "Person / personal brand" }
];

type Suggestion = {
  name: string;
  kind: string;
  marketCategory: string;
  geography: string | null;
  audience: string | null;
  attributes: string[];
  comparedEntities: string[];
  kindRationale: string;
  confidence: number;
};

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AuditWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"seed" | "confirm">("seed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed inputs.
  const [seedUrl, setSeedUrl] = useState("");
  const [seedName, setSeedName] = useState("");

  // Confirm fields.
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLocal, setIsLocal] = useState(true);
  const [nonLocalKind, setNonLocalKind] = useState<NonLocalKind>("org");
  const [name, setName] = useState("");
  const [marketCategory, setMarketCategory] = useState("");
  const [geography, setGeography] = useState("");
  const [audience, setAudience] = useState("");
  const [attributes, setAttributes] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [rationale, setRationale] = useState<string | null>(null);
  const [usedLlm, setUsedLlm] = useState(false);

  function applySuggestion(suggestion: Suggestion, resolvedUrl: string | null) {
    const local = suggestion.kind === "local_business";
    setIsLocal(local);
    if (!local) {
      const match = NON_LOCAL_KINDS.find((k) => k.value === suggestion.kind);
      setNonLocalKind((match?.value as NonLocalKind) ?? "org");
    }
    setName(suggestion.name);
    setMarketCategory(suggestion.marketCategory);
    setGeography(suggestion.geography ?? "");
    setAudience(suggestion.audience ?? "");
    setAttributes(suggestion.attributes.join("\n"));
    setCompetitors(suggestion.comparedEntities.join("\n"));
    setWebsiteUrl(resolvedUrl ?? "");
    setRationale(suggestion.kindRationale);
  }

  async function analyze() {
    if (busy) return;
    if (!seedUrl.trim() && !seedName.trim()) {
      setError("Enter a website URL or a name to start.");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch("/api/intake/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        websiteUrl: seedUrl.trim() || undefined,
        name: seedName.trim() || undefined
      })
    });
    setBusy(false);

    if (!res.ok) {
      setError("Could not analyze that. Try again, or enter details manually.");
      return;
    }

    const body = (await res.json()) as { suggestion: Suggestion; websiteUrl: string | null; usedLlm: boolean };
    setUsedLlm(body.usedLlm);
    applySuggestion(body.suggestion, body.websiteUrl);
    setStep("confirm");
  }

  function skipToManual() {
    setName(seedName.trim());
    setWebsiteUrl(seedUrl.trim());
    setUsedLlm(false);
    setRationale(null);
    setStep("confirm");
  }

  async function commit() {
    if (busy) return;
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setBusy(true);
    setError(null);

    const kind = isLocal ? "local_business" : nonLocalKind;
    const profile: Record<string, unknown> = {
      name: name.trim(),
      kind,
      attributes: lines(attributes),
      comparedEntities: lines(competitors)
    };
    if (websiteUrl.trim()) profile.websiteUrl = websiteUrl.trim();
    if (marketCategory.trim()) profile.marketCategory = marketCategory.trim();
    if (isLocal && geography.trim()) profile.geography = geography.trim();
    if (!isLocal && audience.trim()) profile.audience = audience.trim();

    const res = await fetch("/api/intake/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile })
    });

    if (!res.ok) {
      setBusy(false);
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not create the audit. Check the fields and try again.");
      return;
    }

    const body = (await res.json()) as { businessId: string };
    router.push(`/businesses/${body.businessId}/prompts`);
  }

  if (step === "seed") {
    return (
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-ink">
          Website URL
          <input
            type="url"
            value={seedUrl}
            onChange={(e) => setSeedUrl(e.target.value)}
            placeholder="https://yourbusiness.co.uk"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          We&apos;ll read the site to figure out what you are and pre-fill the next step. You confirm everything before
          anything runs.
        </p>
        <label className="mt-4 block text-sm font-medium text-ink">
          Or just a name
          <input
            type="text"
            value={seedName}
            onChange={(e) => setSeedName(e.target.value)}
            placeholder="e.g. Bright Smile Dental, Notion, Allbirds"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={analyze}
            disabled={busy}
            className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Analyzing..." : "Analyze"}
          </button>
          <button type="button" onClick={skipToManual} className="focus-ring text-sm text-muted hover:text-ink">
            Skip — enter details manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Is this a local business?</legend>
        <p className="mt-1 text-xs text-muted">
          Local: people search it with a place (a dentist, a plumber). National/online: geography isn&apos;t how
          it&apos;s found.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setIsLocal(true)}
            className={`focus-ring rounded-md border px-4 py-2 text-sm ${
              isLocal ? "border-accent bg-accent/10 font-medium text-ink" : "border-line text-muted"
            }`}
          >
            Yes — local
          </button>
          <button
            type="button"
            onClick={() => setIsLocal(false)}
            className={`focus-ring rounded-md border px-4 py-2 text-sm ${
              !isLocal ? "border-accent bg-accent/10 font-medium text-ink" : "border-line text-muted"
            }`}
          >
            No — national / online
          </button>
        </div>
        {rationale && usedLlm ? <p className="mt-2 text-xs italic text-muted">Why we guessed: {rationale}</p> : null}
      </fieldset>

      {!isLocal ? (
        <label className="mt-4 block text-sm font-medium text-ink">
          What kind?
          <select
            value={nonLocalKind}
            onChange={(e) => setNonLocalKind(e.target.value as NonLocalKind)}
            className="focus-ring mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
          >
            {NON_LOCAL_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Category
          <input
            value={marketCategory}
            onChange={(e) => setMarketCategory(e.target.value)}
            placeholder="e.g. dentist, project management tool"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
      </div>

      {isLocal ? (
        <label className="mt-4 block text-sm font-medium text-ink">
          Location / service area
          <input
            value={geography}
            onChange={(e) => setGeography(e.target.value)}
            placeholder="e.g. Woking, Surrey"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
      ) : (
        <label className="mt-4 block text-sm font-medium text-ink">
          Audience <span className="font-normal text-muted">(optional)</span>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. small UK law firms"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
      )}

      <label className="mt-4 block text-sm font-medium text-ink">
        Distinguishing attributes <span className="font-normal text-muted">(one per line)</span>
        <textarea
          value={attributes}
          onChange={(e) => setAttributes(e.target.value)}
          rows={4}
          placeholder={"same-day appointments\nfixed-fee pricing"}
          className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-ink">
        Competitors / alternatives <span className="font-normal text-muted">(one per line)</span>
        <textarea
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          rows={4}
          placeholder={"Competitor One\nCompetitor Two"}
          className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
        />
      </label>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={commit}
          disabled={busy}
          className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Generating prompts..." : "Looks right — generate prompts"}
        </button>
        <button type="button" onClick={() => setStep("seed")} className="focus-ring text-sm text-muted hover:text-ink">
          Back
        </button>
      </div>
    </div>
  );
}
