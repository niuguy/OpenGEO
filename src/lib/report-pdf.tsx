import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font
} from "@react-pdf/renderer";

// Use built-in fonts — no external font registration needed
const ACCENT = "#0f766e";
const INK = "#0f172a";
const MUTED = "#64748b";
const PANEL = "#f8fafc";
const LINE = "#e2e8f0";
const AMBER_BG = "#fffbeb";
const AMBER_BORDER = "#fde68a";
const AMBER_TEXT = "#92400e";
const RED_BG = "#fef2f2";
const RED_TEXT = "#991b1b";
const GREEN_BG = "#f0fdf4";
const GREEN_TEXT = "#166534";
const WHITE = "#ffffff";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingBottom: 48
  },

  // ── Cover ──────────────────────────────────────────────────────────────
  coverHeader: {
    backgroundColor: INK,
    padding: 48,
    paddingBottom: 36
  },
  coverEyebrow: {
    fontSize: 8,
    color: "#94a3b8",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    lineHeight: 1.2,
    marginBottom: 8
  },
  coverSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 4
  },
  coverDate: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 16
  },
  coverKpiRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    paddingTop: 24,
    borderTop: `1 solid #334155`
  },
  coverKpiBox: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 6,
    padding: 14
  },
  coverKpiLabel: {
    fontSize: 7,
    color: "#94a3b8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6
  },
  coverKpiValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: WHITE
  },
  coverKpiSub: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 3
  },
  coverAccentBar: {
    height: 4,
    backgroundColor: ACCENT
  },

  // ── Section layout ─────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 4
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: `1 solid ${LINE}`
  },
  sectionLabel: {
    fontSize: 7,
    color: ACCENT,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4
  },

  // ── Metric grid ────────────────────────────────────────────────────────
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10
  },
  metricBox: {
    flex: 1,
    backgroundColor: PANEL,
    borderRadius: 5,
    padding: 12,
    border: `1 solid ${LINE}`
  },
  metricLabel: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 0.5,
    marginBottom: 5
  },
  metricValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: INK
  },
  metricNote: {
    fontSize: 7,
    color: MUTED,
    marginTop: 3
  },

  // ── Progress bar ───────────────────────────────────────────────────────
  barTrack: {
    height: 4,
    backgroundColor: LINE,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden"
  },
  barFill: {
    height: 4,
    backgroundColor: ACCENT,
    borderRadius: 2
  },

  // ── Table ──────────────────────────────────────────────────────────────
  table: {
    marginTop: 4
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PANEL,
    padding: "6 8",
    borderRadius: 4,
    marginBottom: 2
  },
  tableRow: {
    flexDirection: "row",
    padding: "7 8",
    borderBottom: `1 solid ${LINE}`
  },
  tableRowHighlight: {
    flexDirection: "row",
    padding: "7 8",
    borderBottom: `1 solid ${LINE}`,
    backgroundColor: "#eff6ff"
  },
  tableCell: {
    fontSize: 8,
    color: INK
  },
  tableHeaderCell: {
    fontSize: 7,
    color: MUTED,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3
  },

  // ── Alert / callout boxes ──────────────────────────────────────────────
  alertAmber: {
    backgroundColor: AMBER_BG,
    border: `1 solid ${AMBER_BORDER}`,
    borderRadius: 5,
    padding: 12,
    marginBottom: 8
  },
  alertAmberTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: AMBER_TEXT,
    marginBottom: 5
  },
  alertAmberItem: {
    fontSize: 8,
    color: AMBER_TEXT,
    marginBottom: 3,
    lineHeight: 1.4
  },
  calloutGreen: {
    backgroundColor: GREEN_BG,
    borderRadius: 5,
    padding: 10,
    marginBottom: 5,
    border: `1 solid #bbf7d0`
  },
  calloutText: {
    fontSize: 8,
    color: GREEN_TEXT,
    lineHeight: 1.4
  },

  // ── Prompt list ─────────────────────────────────────────────────────────
  promptItem: {
    paddingVertical: 7,
    borderBottom: `1 solid ${LINE}`
  },
  promptIntent: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 2
  },
  promptMeta: {
    fontSize: 7,
    color: MUTED
  },

  // ── Methodology ────────────────────────────────────────────────────────
  methodBox: {
    backgroundColor: PANEL,
    border: `1 solid ${LINE}`,
    borderRadius: 5,
    padding: 14,
    marginTop: 4
  },
  methodText: {
    fontSize: 8,
    color: MUTED,
    lineHeight: 1.6,
    marginBottom: 6
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6
  },
  tag: {
    backgroundColor: WHITE,
    border: `1 solid ${LINE}`,
    borderRadius: 3,
    padding: "3 6",
    fontSize: 7,
    color: INK
  },

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: `1 solid ${LINE}`,
    paddingTop: 8
  },
  footerText: {
    fontSize: 7,
    color: MUTED
  },
  footerBrand: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: ACCENT
  }
});

// ── Helper components ────────────────────────────────────────────────────────

function Bar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${pct}%` as unknown as number }]} />
    </View>
  );
}

function Footer({ businessName, date, agency }: { businessName: string; date: string; agency?: { name: string } }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{businessName} · AI Visibility Report</Text>
      {agency
        ? <Text style={s.footerBrand}>{agency.name}</Text>
        : <Text style={s.footerBrand}>nearbyAI</Text>
      }
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${date}  ·  ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function TrendChart({ points, label, color }: { points: number[]; label: string; color: string }) {
  const max = Math.max(...points, 1);
  const barW = Math.min(14, Math.floor(200 / points.length));
  const gap = Math.max(1, Math.floor(barW * 0.3));
  const chartH = 48;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 7, color: MUTED, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: chartH, gap }}>
        {points.map((v, i) => {
          const h = Math.max(2, (v / max) * chartH);
          return (
            <View key={i} style={{ width: barW, height: h, backgroundColor: color, borderRadius: 1 }} />
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
        <Text style={{ fontSize: 6, color: MUTED }}>{points[0]}%</Text>
        <Text style={{ fontSize: 6, color: INK, fontFamily: "Helvetica-Bold" }}>{points[points.length - 1]}%</Text>
      </View>
    </View>
  );
}

// ── Main document ─────────────────────────────────────────────────────────────

export type ReportData = {
  agency?: {
    name: string;
    website?: string;
  };
  business: {
    name: string;
    category: string;
    location: string;
  };
  totals: {
    visibilityScore: number;
    shareOfVoice: number;
    recommendationRate: number;
    positionWeightedVisibility: number;
    recommendationConsistency: number;
    volatilityScore: number;
    reliabilityScore: number;
    reliabilityLabel: string;
    topCompetitorDisplacement: string | null;
    completedRunCount: number;
    promptCount: number;
    snapshotCreatedAt: Date | null;
  };
  comparison: {
    name: string;
    isTarget: boolean;
    appearances: number;
    share: number;
    averageRank: number | null;
  }[];
  topAppearingPrompts: {
    promptSamplingIntent: string;
    promptClusterIntent: string;
    targetRank: number | null;
    sentiment: string;
  }[];
  competitorOnlyPrompts: {
    promptSamplingIntent: string;
    promptClusterIntent: string;
    mentionedBusinesses: { name: string }[];
  }[];
  competitorGapReasons: { reason: string; count: number }[];
  semanticAttributes: { label: string; count: number }[];
  referenceSignals: { label: string; sourceType: string; count: number }[];
  providerBreakdown: {
    provider: string;
    label: string;
    completedRunCount: number;
    visibilityScore: number;
    recommendationRate: number;
    shareOfVoice: number;
    averageRank: number | null;
    consistency: number;
  }[];
  snapshotHistory: {
    date: string;
    visibilityScore: number;
    shareOfVoice: number;
    reliabilityScore: number;
  }[];
  methodology: {
    promptCount: number;
    clusterCount: number;
    intentCoverage: { label: string; count: number }[];
  };
};

export function VisibilityReport({ data }: { data: ReportData }) {
  const { business, totals, comparison, agency } = data;
  const reportDate = totals.snapshotCreatedAt
    ? new Date(totals.snapshotCreatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const history = data.snapshotHistory;
  const colW = { name: "40%", appears: "15%", share: "20%", rank: "25%" } as const;
  const provColW = { name: "25%", runs: "12%", vis: "13%", rec: "13%", sov: "13%", rank: "12%", con: "12%" } as const;

  return (
    <Document title={`AI Visibility Report — ${business.name}`} author={agency?.name ?? "nearbyAI"}>

      {/* ── PAGE 1: Cover + Executive Summary ── */}
      <Page size="A4" style={s.page}>
        <View style={s.coverHeader}>
          <Text style={s.coverEyebrow}>AI Search Visibility Report</Text>
          <Text style={s.coverTitle}>{business.name}</Text>
          <Text style={s.coverSub}>{business.category} · {business.location}</Text>
          <Text style={s.coverDate}>Generated {reportDate} · Based on {totals.completedRunCount} AI samples across {totals.promptCount} local-intent prompts</Text>
          {agency && (
            <Text style={[s.coverDate, { marginTop: 6, color: "#94a3b8" }]}>
              {`Prepared by ${agency.name}${agency.website ? ` · ${agency.website}` : ""}`}
            </Text>
          )}

          <View style={s.coverKpiRow}>
            <View style={s.coverKpiBox}>
              <Text style={s.coverKpiLabel}>AI Visibility</Text>
              <Text style={s.coverKpiValue}>{totals.visibilityScore}%</Text>
              <Text style={s.coverKpiSub}>of prompts include this business</Text>
            </View>
            <View style={s.coverKpiBox}>
              <Text style={s.coverKpiLabel}>Share of Voice</Text>
              <Text style={s.coverKpiValue}>{totals.shareOfVoice}%</Text>
              <Text style={s.coverKpiSub}>of competitive mentions</Text>
            </View>
            <View style={s.coverKpiBox}>
              <Text style={s.coverKpiLabel}>Reliability</Text>
              <Text style={[s.coverKpiValue, { textTransform: "capitalize" }]}>{totals.reliabilityLabel}</Text>
              <Text style={s.coverKpiSub}>{totals.reliabilityScore}% confidence score</Text>
            </View>
          </View>
        </View>
        <View style={s.coverAccentBar} />

        <View style={s.section}>
          <Text style={s.sectionLabel}>Executive Summary</Text>
          <SectionTitle>How AI search sees this business</SectionTitle>

          <View style={s.metricRow}>
            {[
              { label: "Recommendation rate", value: `${totals.recommendationRate}%` },
              { label: "Consistency", value: `${totals.recommendationConsistency}%` },
              { label: "Volatility", value: `${totals.volatilityScore}%` },
              { label: "Position-weighted", value: `${totals.positionWeightedVisibility}%` }
            ].map(({ label, value }) => (
              <View key={label} style={s.metricBox}>
                <Text style={s.metricLabel}>{label}</Text>
                <Text style={s.metricValue}>{value}</Text>
              </View>
            ))}
          </View>

          {totals.topCompetitorDisplacement && (
            <View style={s.alertAmber}>
              <Text style={s.alertAmberTitle}>Primary displacement competitor</Text>
              <Text style={s.alertAmberItem}>
                {totals.topCompetitorDisplacement} appears in AI answers where this business is absent.
                This is the most common competitor winning search intent that this business is missing.
              </Text>
            </View>
          )}
        </View>

        {history.length >= 3 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Tracking</Text>
            <SectionTitle>Visibility over time</SectionTitle>
            <View style={{ flexDirection: "row", gap: 20 }}>
              <View style={{ flex: 1 }}>
                <TrendChart points={history.map((h) => h.visibilityScore)} label="AI Visibility %" color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <TrendChart points={history.map((h) => h.shareOfVoice)} label="Share of Voice %" color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <TrendChart points={history.map((h) => h.reliabilityScore)} label="Reliability %" color="#f59e0b" />
              </View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ fontSize: 6, color: MUTED }}>{history[0].date}</Text>
              <Text style={{ fontSize: 6, color: MUTED }}>{history.length} data points</Text>
              <Text style={{ fontSize: 6, color: MUTED }}>{history[history.length - 1].date}</Text>
            </View>
          </View>
        )}

        <Footer businessName={business.name} date={reportDate} agency={agency} />
      </Page>

      {/* ── PAGE 2: Competitive Position + Provider Comparison ── */}
      <Page size="A4" style={s.page}>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Competitive Position</Text>
          <SectionTitle>Business vs. competitors in AI recommendations</SectionTitle>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { width: colW.name }]}>Business</Text>
              <Text style={[s.tableHeaderCell, { width: colW.appears }]}>Appears</Text>
              <Text style={[s.tableHeaderCell, { width: colW.share }]}>Share</Text>
              <Text style={[s.tableHeaderCell, { width: colW.rank }]}>Avg rank</Text>
            </View>
            {comparison.map((row) => (
              <View key={row.name} style={row.isTarget ? s.tableRowHighlight : s.tableRow} wrap={false}>
                <Text style={[s.tableCell, { width: colW.name, fontFamily: row.isTarget ? "Helvetica-Bold" : "Helvetica" }]}>
                  {row.name}{row.isTarget ? " ★" : ""}
                </Text>
                <Text style={[s.tableCell, { width: colW.appears }]}>{row.appearances}</Text>
                <View style={{ width: colW.share }}>
                  <Text style={s.tableCell}>{row.share}%</Text>
                  <Bar value={row.share} />
                </View>
                <Text style={[s.tableCell, { width: colW.rank }]}>
                  {row.averageRank != null ? row.averageRank.toFixed(1) : "—"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {data.providerBreakdown.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Provider Comparison</Text>
            <SectionTitle>Visibility by AI provider</SectionTitle>

            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: provColW.name }]}>Provider</Text>
                <Text style={[s.tableHeaderCell, { width: provColW.runs }]}>Runs</Text>
                <Text style={[s.tableHeaderCell, { width: provColW.vis }]}>Visibility</Text>
                <Text style={[s.tableHeaderCell, { width: provColW.rec }]}>Recommend</Text>
                <Text style={[s.tableHeaderCell, { width: provColW.sov }]}>SoV</Text>
                <Text style={[s.tableHeaderCell, { width: provColW.rank }]}>Avg rank</Text>
                <Text style={[s.tableHeaderCell, { width: provColW.con }]}>Consist.</Text>
              </View>
              {data.providerBreakdown.map((row) => (
                <View key={row.provider} style={s.tableRow} wrap={false}>
                  <Text style={[s.tableCell, { width: provColW.name, fontFamily: "Helvetica-Bold" }]}>{row.label}</Text>
                  <Text style={[s.tableCell, { width: provColW.runs, color: MUTED }]}>{row.completedRunCount}</Text>
                  <Text style={[s.tableCell, { width: provColW.vis }]}>{row.visibilityScore}%</Text>
                  <Text style={[s.tableCell, { width: provColW.rec }]}>{row.recommendationRate}%</Text>
                  <Text style={[s.tableCell, { width: provColW.sov }]}>{row.shareOfVoice}%</Text>
                  <Text style={[s.tableCell, { width: provColW.rank }]}>
                    {row.averageRank != null ? row.averageRank.toFixed(1) : "—"}
                  </Text>
                  <Text style={[s.tableCell, { width: provColW.con }]}>{row.consistency}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Where the business wins */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Where You Win</Text>
          <SectionTitle>{`Prompts where ${business.name} appears in AI answers`}</SectionTitle>

          {data.topAppearingPrompts.length === 0 ? (
            <Text style={[s.metricNote, { marginTop: 8 }]}>No appearances recorded in the current sample set.</Text>
          ) : (
            data.topAppearingPrompts.slice(0, 8).map((result, i) => (
              <View key={i} style={s.promptItem} wrap={false}>
                <Text style={s.promptIntent}>{result.promptSamplingIntent}</Text>
                <Text style={s.promptMeta}>
                  {`${result.promptClusterIntent}${result.targetRank != null ? ` · rank ${result.targetRank}` : ""} · ${result.sentiment}`}
                </Text>
              </View>
            ))
          )}
        </View>

        <Footer businessName={business.name} date={reportDate} agency={agency} />
      </Page>

      {/* ── PAGE 3: Competitive Gaps + Attributes + Evidence ── */}
      <Page size="A4" style={s.page}>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Competitive Gaps</Text>
          <SectionTitle>{`Prompts where competitors appear but ${business.name} does not`}</SectionTitle>

          {data.competitorGapReasons.length > 0 && (
            <View style={s.alertAmber}>
              <Text style={s.alertAmberTitle}>Why competitors are chosen instead</Text>
              {data.competitorGapReasons.map(({ reason, count }) => (
                <Text key={reason} style={s.alertAmberItem}>{`· (${count}×) ${reason}`}</Text>
              ))}
            </View>
          )}

          {data.competitorOnlyPrompts.length === 0 ? (
            <Text style={[s.metricNote, { marginTop: 8 }]}>No competitor-only gaps found in the current sample set.</Text>
          ) : (
            data.competitorOnlyPrompts.slice(0, 6).map((result, i) => (
              <View key={i} style={s.promptItem} wrap={false}>
                <Text style={s.promptIntent}>{result.promptSamplingIntent}</Text>
                <Text style={s.promptMeta}>
                  {result.promptClusterIntent} · mentions: {result.mentionedBusinesses.slice(0, 3).map((b) => b.name).join(", ")}
                </Text>
              </View>
            ))
          )}
        </View>

        {data.semanticAttributes.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Service Attributes Extracted</Text>
            <SectionTitle>Topics AI associates with this business</SectionTitle>
            <View style={s.tagRow}>
              {data.semanticAttributes.slice(0, 12).map(({ label, count }) => (
                <View key={label} style={s.tag}>
                  <Text>{label} · {count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.referenceSignals.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Evidence Signals</Text>
            <SectionTitle>Sources cited by AI in its recommendations</SectionTitle>
            <View style={[s.alertAmber, { marginBottom: 10 }]}>
              <Text style={s.alertAmberTitle}>AI-cited · not independently verified</Text>
              <Text style={s.alertAmberItem}>
                These sources were mentioned by the AI in its answers. They indicate what the AI
                believes to be evidence for its recommendations — treat as signals to investigate,
                not confirmed facts.
              </Text>
            </View>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: "50%" }]}>Source label</Text>
                <Text style={[s.tableHeaderCell, { width: "30%" }]}>Type</Text>
                <Text style={[s.tableHeaderCell, { width: "20%" }]}>Cited</Text>
              </View>
              {data.referenceSignals.slice(0, 10).map((sig) => (
                <View key={`${sig.sourceType}-${sig.label}`} style={s.tableRow} wrap={false}>
                  <Text style={[s.tableCell, { width: "50%" }]}>{sig.label}</Text>
                  <Text style={[s.tableCell, { width: "30%", color: MUTED }]}>{sig.sourceType.replaceAll("_", " ")}</Text>
                  <Text style={[s.tableCell, { width: "20%" }]}>{sig.count}×</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Footer businessName={business.name} date={reportDate} agency={agency} />
      </Page>

      {/* ── PAGE 4: Methodology ── */}
      <Page size="A4" style={s.page}>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Methodology</Text>
          <SectionTitle>How this report was produced</SectionTitle>
          <View style={s.methodBox}>
            <Text style={s.methodText}>
              {`This report is produced using stratified sampling across ${data.methodology.promptCount} diversified local-intent prompts spanning ${data.methodology.clusterCount} intent clusters. Each prompt is sent to AI providers without any business context — simulating how real consumers search — and the responses are structurally extracted to identify mentions, rankings, sentiment, and evidence signals.`}
            </Text>
            <Text style={s.methodText}>
              Visibility scores represent the frequency of appearance across all sampled prompts. Share of voice measures the proportion of all competitive mentions captured. Reliability reflects sample coverage and answer consistency — a low reliability score means more runs are needed to reach statistical confidence.
            </Text>
            <Text style={s.methodText}>
              Methodology informed by: Stanford HELM (multi-scenario LLM evaluation),
              Brittlebench (prompt sensitivity), and Google Search Quality Rater Guidelines
              (local business evidence signals).
            </Text>
            <View style={s.tagRow}>
              {data.methodology.intentCoverage.slice(0, 8).map(({ label, count }) => (
                <View key={label} style={s.tag}>
                  <Text>{label} · {count}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[s.section, { paddingTop: 16 }]}>
          <Text style={[s.footerText, { fontSize: 7, color: MUTED, lineHeight: 1.6 }]}>
            This report reflects AI recommendation patterns observed at the time of data collection.
            AI answers are probabilistic and change frequently. Scores should be interpreted as
            directional indicators, not absolute rankings. {agency?.name ?? "nearbyAI"} is not affiliated with OpenAI,
            Google, or any AI provider referenced herein.
          </Text>
        </View>

        <Footer businessName={business.name} date={reportDate} agency={agency} />
      </Page>

    </Document>
  );
}
