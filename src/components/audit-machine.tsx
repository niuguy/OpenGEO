"use client";

import Link from "next/link";
import { useState } from "react";

type WebsiteAuditResponse = {
  business?: { id: string; name: string; category: string; location: string; websiteUrl: string } | null;
  promptCount?: number;
  pages?: { url: string; title: string | null; headings: string[]; schemaTypes: string[] }[];
  error?: string;
};

type Lead = {
  id: string;
  name: string;
  category: string;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  mapsUrl: string | null;
};

export function AuditMachine() {
  const [websiteResult, setWebsiteResult] = useState<WebsiteAuditResponse | null>(null);
  const [websiteStatus, setWebsiteStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [leadStatus, setLeadStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [leadError, setLeadError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);

  async function auditWebsite(formData: FormData) {
    setWebsiteStatus("loading");
    setWebsiteResult(null);

    const response = await fetch("/api/audit-machine/website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteUrl: formData.get("websiteUrl"),
        maxPages: Number(formData.get("maxPages") || 6)
      })
    });
    const data = (await response.json().catch(() => ({}))) as WebsiteAuditResponse;
    setWebsiteResult(data);
    setWebsiteStatus(response.ok ? "success" : "error");
  }

  async function discoverLeads(formData: FormData) {
    setLeadStatus("loading");
    setLeadError("");
    setLeads([]);

    const response = await fetch("/api/audit-machine/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: formData.get("category"),
        location: formData.get("location"),
        limit: Number(formData.get("limit") || 10)
      })
    });
    const data = (await response.json().catch(() => ({}))) as { leads?: Lead[]; error?: string };
    if (!response.ok) {
      setLeadStatus("error");
      setLeadError(data.error || "Lead discovery failed.");
      return;
    }
    setLeads(data.leads || []);
    setLeadStatus("success");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={auditWebsite} className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Website to audit</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Crawl public site pages, infer the business profile, create an audit, and generate AI visibility prompts.
        </p>
        <label className="mt-4 block text-sm font-medium text-ink">
          Website URL
          <input
            name="websiteUrl"
            type="url"
            required
            placeholder="https://exampleclinic.co.uk"
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-ink">
          Pages to crawl
          <input
            name="maxPages"
            type="number"
            min={1}
            max={12}
            defaultValue={6}
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={websiteStatus === "loading"}
          className="focus-ring mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {websiteStatus === "loading" ? "Auditing..." : "Create audit from website"}
        </button>

        {websiteResult ? (
          <div className="mt-5 rounded-md bg-panel p-4 text-sm text-muted">
            {websiteResult.error ? <p className="text-red-700">{websiteResult.error}</p> : null}
            {websiteResult.business ? (
              <>
                <p className="font-medium text-ink">{websiteResult.business.name}</p>
                <p>
                  {websiteResult.business.category} · {websiteResult.business.location} · {websiteResult.promptCount} prompts
                </p>
                <Link href={`/businesses/${websiteResult.business.id}`} className="mt-3 inline-block text-accent underline">
                  Open audit
                </Link>
              </>
            ) : null}
            {websiteResult.pages?.length ? (
              <div className="mt-4 space-y-2">
                {websiteResult.pages.slice(0, 4).map((page) => (
                  <div key={page.url}>
                    <p className="truncate font-medium text-ink">{page.title || page.url}</p>
                    <p className="truncate">{page.url}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>

      <form action={discoverLeads} className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Prospect discovery</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Find potential local targets through Google Places, then audit their websites and pitch visibility gaps.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Category
            <input
              name="category"
              required
              defaultValue="dentist"
              className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Location
            <input
              name="location"
              required
              defaultValue="Woking, Surrey"
              className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-ink">
          Limit
          <input
            name="limit"
            type="number"
            min={1}
            max={20}
            defaultValue={10}
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={leadStatus === "loading"}
          className="focus-ring mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {leadStatus === "loading" ? "Finding..." : "Find prospects"}
        </button>

        {leadError ? <p className="mt-4 text-sm text-red-700">{leadError}</p> : null}
        {leads.length > 0 ? (
          <div className="mt-5 space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="border-b border-line pb-3 last:border-0">
                <p className="font-medium text-ink">{lead.name}</p>
                <p className="text-sm text-muted">
                  {lead.rating ?? "n/a"} stars · {lead.reviewCount ?? 0} reviews
                </p>
                <p className="text-sm text-muted">{lead.address}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-sm">
                  {lead.websiteUrl ? <a className="text-accent underline" href={lead.websiteUrl}>Website</a> : null}
                  {lead.mapsUrl ? <a className="text-accent underline" href={lead.mapsUrl}>Map listing</a> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  );
}
