type Point = {
  date: string;
  visibilityScore: number;
  shareOfVoice: number;
  recommendationRate: number;
  reliabilityScore: number;
};

type Series = {
  provider: string;
  label: string;
  points: Point[];
};

type MetricKey = "visibilityScore" | "shareOfVoice" | "recommendationRate" | "reliabilityScore";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "visibilityScore", label: "Visibility", color: "#0f766e" },
  { key: "shareOfVoice", label: "Share of Voice", color: "#6366f1" },
  { key: "recommendationRate", label: "Recommendation", color: "#0891b2" },
  { key: "reliabilityScore", label: "Reliability", color: "#f59e0b" },
];

function Sparkline({ points, metricKey, color }: { points: Point[]; metricKey: MetricKey; color: string }) {
  if (points.length < 2) return null;

  const values = points.map((p) => p[metricKey]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const w = 200;
  const h = 48;
  const padY = 4;
  const usableH = h - padY * 2;

  const coords = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: padY + usableH - ((v - min) / range) * usableH,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;

  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <span className="text-2xl font-semibold text-ink">{last}%</span>
        {delta !== 0 && (
          <span className={`text-xs font-medium ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
            {delta > 0 ? "+" : ""}{delta}pt
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${metricKey})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3 : 1.5} fill={color} />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted">{points[0].date}</span>
        <span className="text-[10px] text-muted">{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}

export function SnapshotChart({ history }: { history: Series[] }) {
  if (history.length === 0) return null;

  const hasMultiplePoints = history.some((s) => s.points.length >= 2);
  if (!hasMultiplePoints) return null;

  return (
    <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-ink">Visibility over time</h2>
      <p className="mt-1 text-sm text-muted">
        Trend data from snapshot history. Each data point is one completed audit run.
      </p>

      {history.map((series) => {
        if (series.points.length < 2) return null;
        return (
          <div key={series.provider} className="mt-6">
            {history.length > 1 && (
              <p className="text-xs font-medium text-muted mb-3">{series.label}</p>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {METRICS.map(({ key, label, color }) => (
                <div key={key} className="rounded-md border border-line bg-panel p-3">
                  <p className="text-xs font-medium text-muted mb-2">{label}</p>
                  <Sparkline points={series.points} metricKey={key} color={color} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
