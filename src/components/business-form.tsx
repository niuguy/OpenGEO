"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const demoCompetitors = [
  "Bupa Dental Care Woking",
  "Portmore Dental",
  "Woking Dental Practice",
  "The Dental Practice Woking"
].join("\n");

const demoAttributes = [
  "emergency dentist",
  "root canal",
  "nervous patients",
  "children",
  "Invisalign",
  "same-day appointment"
].join("\n");

function lines(value: FormDataEntryValue | null) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function BusinessForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setStatus("loading");
    setError("");

    const response = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        category: formData.get("category"),
        location: formData.get("location"),
        websiteUrl: formData.get("websiteUrl"),
        competitors: lines(formData.get("competitors")),
        targetAttributes: lines(formData.get("targetAttributes"))
      })
    });

    if (!response.ok) {
      setStatus("error");
      setError("Could not create the audit. Check the required fields.");
      return;
    }

    const data = (await response.json()) as { business: { id: string } };
    router.push(`/businesses/${data.business.id}`);
  }

  return (
    <form action={submit} className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Business name
          <input
            name="name"
            required
            defaultValue="Example Dental Clinic"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Category
          <input
            name="category"
            required
            defaultValue="dentist"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Location
          <input
            name="location"
            required
            defaultValue="Woking, Surrey"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Website URL
          <input
            name="websiteUrl"
            type="url"
            required
            defaultValue="https://example.com"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-ink">
        Competitors
        <textarea
          name="competitors"
          rows={5}
          defaultValue={demoCompetitors}
          className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-ink">
        Target attributes
        <textarea
          name="targetAttributes"
          rows={5}
          defaultValue={demoAttributes}
          className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
        />
      </label>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "loading"}
        className="focus-ring mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "loading" ? "Creating..." : "Create audit"}
      </button>
    </form>
  );
}
