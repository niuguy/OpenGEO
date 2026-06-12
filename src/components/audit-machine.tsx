"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "./ui-extras";

type WebsiteAuditResponse = {
  business?: {
    id: string;
    name: string;
    category: string;
    location: string;
    websiteUrl: string;
  } | null;
  promptCount?: number;
  pages?: {
    url: string;
    title: string | null;
    headings: string[];
    schemaTypes: string[];
  }[];
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

type AuditMachineProps = {
  mode?: "full" | "website-only" | "leads-only";
};

export function AuditMachine({ mode = "full" }: AuditMachineProps) {
  const [websiteResult, setWebsiteResult] =
    useState<WebsiteAuditResponse | null>(null);
  const [websiteStatus, setWebsiteStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [leadStatus, setLeadStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
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
        maxPages: Number(formData.get("maxPages") || 6),
      }),
    });
    const data = (await response
      .json()
      .catch(() => ({}))) as WebsiteAuditResponse;
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
        limit: Number(formData.get("limit") || 10),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      leads?: Lead[];
      error?: string;
    };
    if (!response.ok) {
      setLeadStatus("error");
      setLeadError(data.error || "Lead discovery failed.");
      return;
    }
    setLeads(data.leads || []);
    setLeadStatus("success");
  }

  return (
    <div
      className={mode === "full" ? "grid gap-6 lg:grid-cols-2" : "max-w-2xl"}
    >
      {(mode === "full" || mode === "website-only") && (
        <form
          action={auditWebsite}
          className="rounded-lg border border-line bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold text-ink">Website to audit</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Crawl public site pages, infer the business profile, create an
            audit, and generate AI visibility prompts.
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
            {websiteStatus === "loading"
              ? "Auditing..."
              : "Create audit from website"}
          </button>

          {websiteResult ? (
            <div className="mt-5 rounded-md bg-panel p-4 text-sm text-muted">
              {websiteResult.error ? (
                <p className="text-red-700">{websiteResult.error}</p>
              ) : null}
              {websiteResult.business ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {websiteResult.business.name}
                    </p>
                    <p className="mt-1 flex items-center gap-2">
                      <Badge variant="accent">
                        {websiteResult.business.category}
                      </Badge>
                      <span>{websiteResult.business.location}</span>
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-3 border border-line">
                    <p className="text-xs font-medium text-ink uppercase tracking-wide">
                      Prompts Generated (Drafts)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-accent">
                      {websiteResult.promptCount}
                    </p>
                    <p className="mt-1 text-xs leading-5">
                      No AI answers have been sampled yet. Review and approve
                      the prompts, then run them — the report fills in as the
                      samples complete.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/businesses/${websiteResult.business.id}/prompts`}
                      className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Review prompts &amp; run
                    </Link>
                    <Link
                      href={`/businesses/${websiteResult.business.id}`}
                      className="inline-flex items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-panel"
                    >
                      Open report
                    </Link>
                  </div>
                </div>
              ) : null}
              {websiteResult.pages?.length ? (
                <div className="mt-4 space-y-2">
                  {websiteResult.pages.slice(0, 4).map((page) => (
                    <div key={page.url}>
                      <p className="truncate font-medium text-ink">
                        {page.title || page.url}
                      </p>
                      <p className="truncate">{page.url}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      )}

      {(mode === "full" || mode === "leads-only") && (
        <form
          action={discoverLeads}
          className="rounded-lg border border-line bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold text-ink">Prospect discovery</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Find potential local targets through Google Places, then audit their
            websites and pitch visibility gaps.
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

          {leadError ? (
            <p className="mt-4 text-sm text-red-700">{leadError}</p>
          ) : null}
          {leads.length > 0 ? (
            <div className="mt-5 space-y-3">
              <p className="text-[10px] font-bold text-ink uppercase tracking-widest border-b border-line pb-1">
                Found Prospects
              </p>
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="group relative rounded-md border border-line bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink group-hover:text-accent transition-colors">
                        {lead.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <span className="flex items-center text-yellow-600 font-medium">
                          ★ {lead.rating ?? "n/a"}
                        </span>
                        <span>·</span>
                        <span>{lead.reviewCount ?? 0} reviews</span>
                      </div>
                    </div>
                    <Badge variant="default">{lead.category}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted line-clamp-1">
                    {lead.address}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {lead.websiteUrl ? (
                      <a
                        className="font-medium text-accent hover:underline"
                        href={lead.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Website
                      </a>
                    ) : null}
                    {lead.mapsUrl ? (
                      <a
                        className="font-medium text-accent hover:underline"
                        href={lead.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Map listing
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
