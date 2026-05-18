import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getBusinessDashboard } from "../src/lib/dashboard";
import { prisma } from "../src/lib/prisma";

const outDir = "dist-cloudflare-demo";

type ClinicReport = Awaited<ReturnType<typeof buildClinicReport>>;

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodedSlug(value: string) {
  return createHash("sha256").update(`nearbyai-demo:${value}`).digest("hex").slice(0, 12);
}

function formatRank(rank: number | null) {
  return rank ? rank.toFixed(1) : "n/a";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function actionTemplates(
  clinic: string,
  isTarget: boolean,
  share: number,
  appearances: number,
  topReferenceSignals: string[]
) {
  const visibilityAction =
    appearances === 0
      ? "Establish baseline evidence pages for the clinic before trying to influence recommendation frequency."
      : share < 35
        ? "Strengthen evidence around the high-intent prompts where competitors appear more often."
        : "Protect current visibility by expanding evidence across adjacent service and urgency prompts.";
  const signalAction =
    topReferenceSignals.length > 0
      ? `Current sampled answers cite signals including ${topReferenceSignals.slice(0, 3).join(", ")}.`
      : "Current sampled answers do not yet expose enough concrete source signals for this clinic.";

  return [
    {
      title: "Strengthen high-intent service evidence",
      why: `${clinic} appears in ${appearances} sampled answers with ${share}% prompt share.`,
      work: "Create or improve pages for emergency dentist, same-day appointment, Invisalign, nervous patients, children, and root canal. Add clear service copy, FAQs, opening-hour proof, and internal links.",
      measurement: "Re-run the same prompt clusters and compare recommendation rate, share of voice, and position-weighted visibility."
    },
    {
      title: "Build trust signals AI systems can summarize",
      why: signalAction,
      work: "Make Google Business Profile reviews, Trustpilot or review-site presence, clinician bios, qualifications, treatment explanations, pricing or finance guidance, and LocalBusiness/Dentist schema easy to corroborate from public pages.",
      measurement: "Track semantic attribute frequency plus model-mentioned reference signals for reviews, websites, listings, opening hours, and service pages."
    },
    {
      title: isTarget ? "Close competitor displacement gaps" : "Defend current competitor advantage",
      why: visibilityAction,
      work: "Compare competitor pages and reviews against the prompt clusters where they appear. Fill missing evidence before running the next benchmark.",
      measurement: "Track competitor displacement count and share of voice over the next sample run."
    }
  ];
}

async function buildClinicReport(clinicName: string, isTarget: boolean) {
  const dashboard = await getBusinessDashboard("demo-woking-dentist");
  if (!dashboard) {
    throw new Error("Demo business not found. Run pnpm prisma:seed first.");
  }

  const comparison = dashboard.comparison.find((row) => normalize(row.name) === normalize(clinicName));
  const results = dashboard.latestResults.filter((result) =>
    result.mentionedBusinesses.some((mentioned) => normalize(mentioned.name) === normalize(clinicName))
  );
  const attributeCounts = new Map<string, number>();
  const referenceSignalCounts = new Map<string, { label: string; sourceType: string; count: number; evidence: string | null }>();
  for (const result of results) {
    for (const attribute of result.semanticAttributes) {
      attributeCounts.set(attribute.label, (attributeCounts.get(attribute.label) ?? 0) + 1);
    }
    for (const signal of result.referenceSignals) {
      const key = `${signal.sourceType}:${signal.label}`;
      const current = referenceSignalCounts.get(key);
      referenceSignalCounts.set(key, {
        label: current?.label ?? signal.label,
        sourceType: current?.sourceType ?? signal.sourceType,
        count: (current?.count ?? 0) + 1,
        evidence: current?.evidence ?? signal.evidence
      });
    }
  }

  const share = comparison?.share ?? 0;
  const appearances = comparison?.appearances ?? 0;
  const referenceSignals = Array.from(referenceSignalCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    dashboard,
    clinicName,
    isTarget,
    slug: encodedSlug(clinicName),
    appearances,
    share,
    averageRank: comparison?.averageRank ?? null,
    actionItems: actionTemplates(
      clinicName,
      isTarget,
      share,
      appearances,
      referenceSignals.map((signal) => signal.label)
    ),
    attributes: Array.from(attributeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14),
    referenceSignals,
    evidence: results.slice(0, 6)
  };
}

function styles() {
  return `<style>
    :root { color-scheme: light; --ink:#172026; --muted:#637083; --line:#dbe3ec; --panel:#f7f9fb; --accent:#146c94; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--panel); color:var(--ink); }
    header { border-bottom:1px solid var(--line); background:#fff; }
    .wrap { max-width:1120px; margin:0 auto; padding:28px 20px; }
    .top { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; }
    .eyebrow { color:var(--accent); font-weight:700; letter-spacing:.05em; text-transform:uppercase; font-size:12px; }
    h1 { margin:10px 0 0; font-size:36px; line-height:1.1; }
    h2 { margin:0; font-size:18px; }
    h3 { margin:0 0 8px; font-size:16px; }
    p { color:var(--muted); line-height:1.6; }
    a { color:var(--accent); }
    .button { display:inline-block; border:1px solid var(--line); background:#fff; color:var(--ink); padding:10px 14px; border-radius:8px; text-decoration:none; font-size:14px; }
    .hero { background:#fff; border:1px solid var(--line); border-radius:8px; padding:24px; margin-top:24px; }
    .hero-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; }
    .label { color:var(--muted); font-size:14px; }
    .value { margin-top:8px; font-size:42px; font-weight:750; letter-spacing:0; }
    .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-top:18px; }
    .card { background:#fff; border:1px solid var(--line); border-radius:8px; padding:18px; }
    .card .value { font-size:30px; }
    .two { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:24px; }
    .actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:18px; }
    table { width:100%; border-collapse:collapse; font-size:14px; }
    th, td { border-bottom:1px solid var(--line); padding:10px 8px; text-align:left; vertical-align:top; }
    th { color:var(--muted); font-weight:600; }
    .pill { display:inline-block; border:1px solid var(--line); background:var(--panel); border-radius:6px; padding:5px 8px; margin:4px 4px 0 0; font-size:12px; }
    article { border-bottom:1px solid var(--line); padding:14px 0; }
    article:last-child { border-bottom:0; }
    .answer { max-height:150px; overflow:hidden; }
    @media (max-width: 820px) { .top,.hero-grid,.two,.grid,.actions { grid-template-columns:1fr; display:grid; } h1 { font-size:30px; } }
  </style>`;
}

function pageShell(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  ${styles()}
</head>
<body>
  <header><div class="wrap top"><strong>Local AI Visibility Tracker</strong><a class="button" href="/">Report index</a></div></header>
  <main class="wrap">${body}</main>
</body>
</html>`;
}

function renderIndex(reports: ClinicReport[]) {
  const dashboard = reports[0].dashboard;
  return pageShell(
    "NearbyAI Dentist Visibility Reports",
    `<section>
      <div class="eyebrow">Private agency demo</div>
      <h1>Dentist AI visibility action reports</h1>
      <p>Encoded report links for the indexed Woking dentist clinics. URLs do not expose clinic names, but anyone with a link can view that report.</p>
    </section>
    <section class="hero">
      <div class="hero-grid">
        <div><div class="label">Prompt set</div><div class="value">${dashboard.totals.promptCount}</div><p>Diversified local-intent prompt variants.</p></div>
        <div><div class="label">Completed runs</div><div class="value">${dashboard.totals.completedRunCount}</div><p>Live OpenAI samples currently included.</p></div>
        <div><div class="label">Reliability</div><div class="value">${escapeHtml(dashboard.totals.reliabilityLabel)}</div><p>${dashboard.totals.reliabilityScore}% from sample coverage and volatility.</p></div>
      </div>
    </section>
    <section class="card" style="margin-top:24px">
      <h2>Encoded clinic reports</h2>
      <table><thead><tr><th>Report</th><th>Appears</th><th>Prompt share</th><th>Avg observed position</th></tr></thead><tbody>
        ${reports
          .map(
            (report) =>
              `<tr><td><a href="/r/${report.slug}/">Report ${report.slug}</a></td><td>${report.appearances}</td><td>${report.share}%</td><td>${formatRank(report.averageRank)}</td></tr>`
          )
          .join("")}
      </tbody></table>
    </section>`
  );
}

function renderReport(report: ClinicReport) {
  return pageShell(
    `${report.clinicName} AI Visibility Action Report`,
    `<section>
      <div class="eyebrow">Encoded clinic report ${report.slug}</div>
      <h1>${escapeHtml(report.clinicName)}</h1>
      <p>${report.dashboard.business.category} in ${report.dashboard.business.location}</p>
      <p>This report converts sampled AI recommendation behavior into practical content, reputation, and local SEO actions. It does not claim fixed AI rankings.</p>
    </section>
    <section class="hero">
      <div class="hero-grid">
        <div><div class="label">Prompt share</div><div class="value">${report.share}%</div><p>Share of active prompts where this clinic appeared in the latest completed samples.</p></div>
        <div><div class="label">Appearances</div><div class="value">${report.appearances}</div><p>Sampled answers where this clinic was mentioned.</p></div>
        <div><div class="label">Avg observed position</div><div class="value">${formatRank(report.averageRank)}</div><p>Average extracted position when explicit ordering was present.</p></div>
      </div>
    </section>
    <section class="card" style="margin-top:24px">
      <h2>Provider comparison</h2>
      <table><thead><tr><th>Provider</th><th>Runs</th><th>Visibility</th><th>Recommendation</th><th>Share of voice</th><th>Avg position</th></tr></thead><tbody>
        ${report.dashboard.providerBreakdown
          .map(
            (row) =>
              `<tr><td>${escapeHtml(row.label)}</td><td>${row.completedRunCount}</td><td>${row.visibilityScore}%</td><td>${row.recommendationRate}%</td><td>${row.shareOfVoice}%</td><td>${formatRank(row.averageRank)}</td></tr>`
          )
          .join("") || `<tr><td colspan="6">No provider samples completed yet.</td></tr>`}
      </tbody></table>
    </section>
    <section style="margin-top:24px">
      <h2>Recommended actions</h2>
      <div class="actions">
        ${report.actionItems
          .map(
            (action) =>
              `<div class="card"><h3>${escapeHtml(action.title)}</h3><p><strong>Why:</strong> ${escapeHtml(action.why)}</p><p><strong>Work:</strong> ${escapeHtml(action.work)}</p><p><strong>Measure:</strong> ${escapeHtml(action.measurement)}</p></div>`
          )
          .join("")}
      </div>
    </section>
    <section class="two">
      <div class="card">
        <h2>Attributes associated with this clinic</h2>
        ${report.attributes.map(([label, count]) => `<span class="pill">${escapeHtml(label)} · ${count}</span>`).join("") || "<p>No attributes extracted for this clinic yet.</p>"}
      </div>
      <div class="card">
        <h2>Competitive context</h2>
        <table><thead><tr><th>Business</th><th>Appears</th><th>Share</th><th>Avg position</th></tr></thead><tbody>
          ${report.dashboard.comparison
            .map(
              (row) =>
                `<tr><td>${escapeHtml(row.name)}</td><td>${row.appearances}</td><td>${row.share}%</td><td>${formatRank(row.averageRank)}</td></tr>`
            )
            .join("")}
        </tbody></table>
      </div>
    </section>
    <section class="card" style="margin-top:24px">
      <h2>Reference signals mentioned</h2>
      <p>These are evidence signals cited or implied by sampled AI answers, not independent verification.</p>
      ${report.referenceSignals.map((signal) => `<span class="pill">${escapeHtml(signal.label)} · ${escapeHtml(signal.sourceType.replaceAll("_", " "))} · ${signal.count}</span>`).join("") || "<p>No structured reference signals extracted for this clinic yet.</p>"}
    </section>
    <section class="card" style="margin-top:24px">
      <h2>Evidence samples</h2>
      ${report.evidence
        .map(
          (result) =>
            `<article><strong>${escapeHtml(result.promptText)}</strong><p class="answer">${escapeHtml(result.rawAnswer)}</p><p>${escapeHtml(result.model)} · confidence ${result.confidence}</p></article>`
        )
        .join("") || "<p>No evidence samples for this clinic yet.</p>"}
    </section>`
  );
}

async function main() {
  const dashboard = await getBusinessDashboard("demo-woking-dentist");
  if (!dashboard) {
    throw new Error("Demo business not found. Run pnpm prisma:seed first.");
  }

  const clinicNames = dashboard.comparison.map((row) => row.name);
  const reports = await Promise.all(clinicNames.map((name) => buildClinicReport(name, normalize(name) === normalize(dashboard.business.name))));

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.html"), renderIndex(reports));

  for (const report of reports) {
    const reportDir = join(outDir, "r", report.slug);
    await mkdir(reportDir, { recursive: true });
    await writeFile(join(reportDir, "index.html"), renderReport(report));
  }

  const targetReport = reports.find((report) => report.isTarget) ?? reports[0];
  await mkdir(join(outDir, "businesses", dashboard.business.id), { recursive: true });
  await writeFile(join(outDir, "businesses", dashboard.business.id, "index.html"), renderReport(targetReport));

  console.log(`Exported ${reports.length} encoded reports to ${outDir}.`);
  for (const report of reports) {
    console.log(`${report.slug}: ${report.clinicName}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
