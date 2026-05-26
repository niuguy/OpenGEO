import { Badge, ProgressBar } from "@/components/ui-extras";

type CategoryStatus = "pass" | "warn" | "fail";

type Category = {
  label: string;
  score: number;
  status: CategoryStatus;
};

const DEMO_CATEGORIES: Category[] = [
  { label: "Structured data", score: 88, status: "pass" },
  { label: "AI crawler config", score: 100, status: "pass" },
  { label: "Google Business Profile", score: 62, status: "warn" },
  { label: "Off-site citations", score: 34, status: "fail" },
];

const DEMO_READINESS = {
  score: 68,
  categoriesTotal: 8,
  categoriesPassing: 6,
  checksNeedingAttention: 3,
};

const DEMO_SPOT_CHECK = {
  provider: "ChatGPT",
  model: "gpt-4o-mini-2024-07-18",
  fingerprint: "fp_8f3e2a",
  appearances: 8,
  totalSamples: 15,
  rate: 53,
  ciLow: 28,
  ciHigh: 77,
  avgRank: 2,
};

const DEMO_TOP_FIX = {
  title: "Add LocalBusiness JSON-LD with AggregateRating",
  impact: 14,
};

function statusGlyph(status: CategoryStatus) {
  if (status === "pass") {
    return { icon: "✓", className: "text-emerald-600" };
  }
  if (status === "warn") {
    return { icon: "⚠", className: "text-amber-600" };
  }
  return { icon: "✗", className: "text-rose-600" };
}

export function DemoReportCard({
  businessName,
  location,
}: {
  businessName: string;
  location: string;
}) {
  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-accent/20 to-transparent blur-2xl" />
      <div className="relative rounded-2xl border border-line bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Demo Report
            </p>
            <p className="mt-0.5 font-semibold text-ink">{businessName}</p>
            <p className="text-xs text-muted">{location}</p>
          </div>
          <Badge variant="accent">Live Data</Badge>
        </div>

        <section className="px-6 py-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              AI Readiness Score
            </p>
            <span className="text-[10px] font-medium text-muted">
              vs Google + OpenAI + Schema.org standards
            </span>
          </div>

          <div className="mt-4 flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-panel">
              <span className="text-3xl font-bold leading-none text-ink">
                {DEMO_READINESS.score}
              </span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                / 100
              </span>
            </div>
            <div className="text-sm leading-6 text-muted">
              <p>
                <span className="font-semibold text-ink">
                  {DEMO_READINESS.categoriesPassing} of {DEMO_READINESS.categoriesTotal}
                </span>{" "}
                categories passing
              </p>
              <p>
                <span className="font-semibold text-ink">
                  {DEMO_READINESS.checksNeedingAttention}
                </span>{" "}
                checks need attention
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {DEMO_CATEGORIES.map((category) => {
              const glyph = statusGlyph(category.status);
              return (
                <li key={category.label} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink">
                      <span
                        className={`text-sm font-bold leading-none ${glyph.className}`}
                      >
                        {glyph.icon}
                      </span>
                      {category.label}
                    </span>
                    <span className="font-semibold text-ink">
                      {category.score}%
                    </span>
                  </div>
                  <ProgressBar value={category.score} className="mt-1.5" />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-t border-line bg-panel/40 px-6 py-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              AI Spot Check · {DEMO_SPOT_CHECK.provider}
            </p>
            <span className="text-[10px] font-medium text-emerald-700">
              fingerprint stable ✓
            </span>
          </div>

          <p className="mt-3 text-sm text-ink">
            Mentioned in{" "}
            <span className="font-semibold">
              {DEMO_SPOT_CHECK.appearances} of {DEMO_SPOT_CHECK.totalSamples}
            </span>{" "}
            samples
          </p>

          <div className="mt-2">
            <ProgressBar value={DEMO_SPOT_CHECK.rate} />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
              <span>
                <span className="font-semibold text-ink">
                  {DEMO_SPOT_CHECK.rate}%
                </span>{" "}
                (95% CI {DEMO_SPOT_CHECK.ciLow}–{DEMO_SPOT_CHECK.ciHigh}%)
              </span>
              <span>Avg rank #{DEMO_SPOT_CHECK.avgRank} when mentioned</span>
            </div>
          </div>

          <p className="mt-3 font-mono text-[10px] text-muted">
            {DEMO_SPOT_CHECK.model} · {DEMO_SPOT_CHECK.fingerprint}
          </p>
        </section>

        <section className="border-t border-line bg-amber-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
              Top Fix
            </p>
            <span className="text-[10px] font-semibold text-amber-800">
              +{DEMO_TOP_FIX.impact} readiness points
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-900">
            {DEMO_TOP_FIX.title}
          </p>
        </section>
      </div>
    </div>
  );
}
