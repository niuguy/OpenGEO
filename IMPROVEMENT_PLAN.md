# Improvement Plan — Business Model & Positioning

Status: draft (2026-05-21). For internal iteration; not customer-facing.

---

## 1. Current state (diagnosis)

| Area | What exists | Gap |
|---|---|---|
| ICP | Landing page sells to SMBs *and* agencies (`src/app/page.tsx` lines 209–229) | Two incompatible motions. Schema has no agency/multi-tenant model. |
| Pricing | None. Contact form (`AgencyInquiry`) is the only conversion event. | No price signal, no self-serve, no qualification. |
| Cost gating | Queued mode (no API key in request) runs on `OPENAI_API_KEY` from env (`src/app/api/businesses/[id]/run-prompts`) | Every anonymous "run audit" click bills our OpenAI account. |
| Recurring product | `Business.monitoringEnabled`, `monitoringIntervalDays`, `alertEmail` columns exist | No subscription wraps these. Monitoring is a free feature with no SKU. |
| Lead gen | `LeadProspect` + `OutreachCrawl` + `prospecting/page.tsx` (Google Places + email scraping) | More developed than monetization. Implies the real model is consulting-with-software, not SaaS. |

---

## 2. Positioning decision

**Pick one ICP. Recommendation: SEO/marketing agencies serving local-services verticals.**

Why agencies, not SMBs:
- SMB owners can't act on "Share of Voice 12%" — they don't write the website copy or own the directory listings. Low willingness-to-pay, high churn.
- Agencies own the levers (content, citations, schema markup) and need reporting deliverables. They have budget and renewal incentive.
- The prospecting/outreach tooling you've already built fits agency-style account work, not self-serve.
- Differentiation vs. Profound / AthenaHQ / Otterly: **local-services focus + cross-provider transparency + raw-answer evidence**. Enterprise-brand tools don't do local intent well.

**New one-line pitch:** *"AI search visibility reports for local-services agencies — ChatGPT, Gemini, and Google AI Search, with raw evidence your clients can verify."*

Drop the "For Businesses" copy block from `src/app/page.tsx` until there's a self-serve SMB funnel worth pointing at.

---

## 3. Pricing sketch (v0 — iterate after first 3 paid conversations)

Three tiers. All numbers are starting points, not committed.

### Starter — £149 / month
- Up to **3 businesses** monitored
- Weekly re-run (uses `monitoringIntervalDays = 7`)
- ChatGPT only
- Email alerts on visibility drop > 10 pts
- PDF report export

### Agency — £499 / month
- Up to **25 businesses**
- Daily re-runs available
- All providers (ChatGPT + Gemini + Google AI Search)
- White-label PDF + CSV exports
- Cross-client dashboard (needs schema change — see §5)
- Slack alerts

### Custom / Lead-gen — quote
- Outreach mode: prospecting crawler + audit-on-demand for net-new agency leads
- This is the *consulting* tier — sold via the existing contact form
- Lives where `LeadProspect` + `OutreachCrawl` already point

### Free demo (gated)
- One audit per email/domain
- Capped at 10 prompts
- Single provider (ChatGPT)
- No re-runs, no monitoring

---

## 4. Product gates that must ship before charging

**P0 — required to charge:**

1. **Auth.** No accounts today. Need email + magic link minimum. Pick: NextAuth or Clerk.
2. **Gate queued mode.** `POST /api/businesses/[id]/run-prompts` without API key currently uses env `OPENAI_API_KEY` unbounded. Add: requires authenticated user, deducts from their plan's run quota.
3. **Plan model in schema.** New `Account` + `Subscription` + `UsageLedger` tables. `Business` belongs to `Account`. Multi-tenant from day one — retrofitting later is painful.
4. **Stripe.** Billing portal, webhook → `Subscription.status`.
5. **Visible pricing page.** Even if the closer is still a form, advertise the numbers. Pre-revenue clarity beats post-revenue confusion.

**P1 — required for the Agency tier to be real:**

6. **Cross-client dashboard.** One agency, many `Business` rows. Filters by client. The current dashboard is single-business (`businesses/[id]/page.tsx`).
7. **White-label.** Custom logo + colors on PDF report (`src/app/api/businesses/[id]/report.pdf/` exists already — extend it).
8. **CSV export beyond prompts.** Currently only `prompts.csv` is exported. Add metrics-over-time CSV.
9. **Slack webhook** as an alternative to `alertEmail`.

**P2 — defensibility, post first £10k MRR:**

10. **Recommendations engine.** Today the product diagnoses but doesn't prescribe. Use the `ReferenceSignal` + `SemanticAttribute` data to generate concrete "fix this on your client's site" actions. This is the moat vs. Profound/Athena.
11. **Managed Agent mode** (per I/O 2026 announcements) as an exploratory second audit type — labeled separately from the deterministic stratified audit.

---

## 5. Schema deltas needed (for §4 P0/P1)

```prisma
model Account {
  id              String   @id @default(cuid())
  name            String
  type            String   // "agency" | "direct"
  stripeCustomerId String? @unique
  createdAt       DateTime @default(now())
  users           User[]
  businesses      Business[]
  subscription    Subscription?
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  accountId   String
  role        String   // "owner" | "member"
  account     Account  @relation(fields: [accountId], references: [id])
}

model Subscription {
  id                   String   @id @default(cuid())
  accountId            String   @unique
  tier                 String   // "starter" | "agency" | "custom"
  status               String   // "trialing" | "active" | "past_due" | "canceled"
  stripeSubscriptionId String?  @unique
  currentPeriodEnd     DateTime
  account              Account  @relation(fields: [accountId], references: [id])
}

model UsageLedger {
  id          String   @id @default(cuid())
  accountId   String
  businessId  String?
  kind        String   // "prompt_run" | "audit" | "monitor_tick"
  cost        Float    // OpenAI cost in USD
  createdAt   DateTime @default(now())
  @@index([accountId, createdAt])
}
```

`Business` gains `accountId String` (required, FK). All existing queries gain an `accountId` filter — non-trivial migration. Demo business stays publicly readable behind a special account.

---

## 6. Cost model sanity check

Per audit (rough, gpt-4o-mini at current prices):
- ~60 prompts × 2 calls each (answer + extraction) × ~$0.0003 = **~$0.04 per audit per provider**
- Three providers = **~$0.12 per business per audit**
- Weekly monitoring × 25 businesses (Agency tier) = ~$12/month in API costs
- Gross margin on £499 Agency tier: ~97% before Stripe/hosting/dev. Healthy.

Free-demo abuse risk: a bot loop can rack up costs fast. Magic-link auth + per-email cap + Cloudflare Turnstile on the form is mandatory before turning queued mode on for the public.

---

## 7. Sequenced rollout (6 weeks)

**Week 1 — Positioning + gating**
- Rewrite `src/app/page.tsx` hero + sections to agency-only ICP
- Add `/pricing` page with the three tiers (no Stripe yet, just info + contact CTA)
- Cloudflare Turnstile on contact form and on `run-prompts` queued mode
- Soft cap: queued mode requires email, max 10 prompts per email per day

**Week 2 — Auth**
- NextAuth (magic link) integration
- `Account` + `User` tables; everything previously anonymous gets attached to an account
- Demo business made read-only public

**Week 3 — Multi-tenancy migration**
- Add `accountId` to `Business`; backfill via migration
- All API routes filter by `accountId`
- Cross-client list view (`/dashboard`)

**Week 4 — Stripe + plan enforcement**
- `Subscription` table + Stripe webhook
- Quota enforcement on `run-prompts` (lookup plan, check `UsageLedger`, reject if over)
- Pricing page → Stripe Checkout

**Week 5 — Agency features**
- White-label fields on `Account` (logo, brand color)
- Wire into existing `report.pdf` route
- Slack webhook field, send via existing monitoring code path

**Week 6 — First sales**
- Run paid pilots with 3 agencies from the existing prospecting list
- Document objections; iterate pricing/features based on what they actually say no to

---

## 8. Open questions (need a call to resolve)

1. Are we comfortable killing the SMB-direct angle entirely, or do we want a £29/mo "single business" tier as a low-end honeypot?
2. Is the lead-gen/prospecting product an internal sales tool or an external SKU? (If external: separate brand, separate landing page — the data ethics of scraping emails are a different conversation than "AI visibility reports.")
3. Geography: UK-only for v1, or US/UK? Reference signals taxonomy (NHS, ICAEW etc.) is currently UK-heavy.
4. Self-serve onboarding vs. sales-led: do we want agencies to be able to swipe a card and start, or only after a demo call? Self-serve is cheaper but converts worse on £499 tiers.

---

## 9. Methodology pivot: rules-based audit + hardened AI Spot Check

**Decision:** Stop relying on LLM-as-judge for the headline metric. Split the product into two clearly-separated surfaces:

- **AI Readiness Score** — deterministic, rules-based audit of the *inputs* AI models use (the new headline).
- **AI Spot Check** — LLM observation of *outputs*, hardened to reduce uncertainty (kept as a secondary, marketing-ready signal).

The old `VisibilitySnapshot` flow (random prompts → ChatGPT → LLM extractor) is retired as the primary metric. Same input + same business profile must produce the same score on every run.

### 9.1 Why pivot

Current LLM-observation method is non-reproducible: re-running yesterday's audit gives different numbers even when nothing about the business has changed. That breaks trend tracking, alerting, and client-facing claims. Two paths forward:

1. **Audit the inputs** (rules-based) — what an agency can actually fix.
2. **Audit the outputs** (LLM observation) — keep but harden so its uncertainty is bounded and disclosed.

We do both, in their proper roles.

### 9.2 Part A — AI Readiness Score (rules-based, headline)

We measure compliance against published, deterministic standards. Same URL + same business profile → same score, every run.

**Deterministic data sources we audit against:**

| Source | What we check |
|---|---|
| Schema.org (validated via Google Rich Results Test API) | `LocalBusiness` + vertical subtypes, required + recommended props, `AggregateRating`, `Review`, `Service`, `OfferCatalog`, `BreadcrumbList` |
| Google Places API | GBP claim status, categories, hours, photos, reviews, response rate, posts recency |
| `robots.txt` (parsed) | GPTBot, OAI-SearchBot, Google-Extended, ClaudeBot, PerplexityBot, Applebot-Extended directives |
| `llms.txt` / `ai.txt` | Presence + validity |
| Google PageSpeed Insights API | Core Web Vitals (LCP, INP, CLS) |
| Site crawl (deterministic) | HTTPS, viewport meta, OG/Twitter Card metadata, contact NAP consistency, service pages per offered service |
| Trustpilot/Yelp APIs | Profile claim status, review count + rating, response rate |
| Vertical directories | NHS Find a Dentist, GDC, ICAEW, ACCA, SRA, Law Society, etc. |
| Ahrefs/Moz (optional, paid) | Domain authority, referring domains |

**Check categories (v1: ~52 checks):**

| Category | Checks |
|---|---|
| 1. AI Crawler Configuration | 10 |
| 2. Structured Data Completeness | 12 |
| 3. Google Business Profile | 10 |
| 4. Site & Content Signals | 8 |
| 5. Off-site Citations & Reviews | 8 |
| 6. Authority & Link Profile (optional) | 4 |

Each check returns `{ status: "pass" | "warn" | "fail" | "na", evidence, fixGuidance }`. Aggregate to a 0-100 **AI Readiness Score** per category + overall. Audit runs in ~4-6 min, cost effectively zero (PageSpeed + Places are free-tier; optional paid APIs ≈ $1-2/audit).

**Schema:**

```prisma
model AuditCheck {
  id          String   @id            // "schema.local-business.required-props"
  category    String
  label       String
  description String
  weight      Int      @default(1)
  vertical    String?
  source      String                   // "google" | "openai" | "schema.org" | "internal"
  docsUrl     String?
}

model AuditRun {
  id           String   @id @default(cuid())
  businessId   String
  startedAt    DateTime @default(now())
  completedAt  DateTime?
  overallScore Int?
  status       String   @default("running")
  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  results      AuditCheckResult[]
  @@index([businessId, startedAt])
}

model AuditCheckResult {
  id          String   @id @default(cuid())
  auditRunId  String
  checkId     String
  status      String
  evidence    String
  fixGuidance String?
  rawResponse Json?
  auditRun    AuditRun   @relation(fields: [auditRunId], references: [id], onDelete: Cascade)
  check       AuditCheck @relation(fields: [checkId], references: [id])
  @@index([auditRunId])
}
```

**Code layout:**

```
src/lib/audit/
  index.ts                  # orchestrator
  checks/
    crawler-config.ts       # robots.txt, llms.txt, GPTBot, Google-Extended parsers
    structured-data.ts      # JSON-LD extraction + Schema.org validation
    google-business.ts      # Places API
    site-signals.ts         # PageSpeed, viewport, https, OG
    citations.ts            # Trustpilot/Yelp/vertical-directory checks
    authority.ts            # optional Ahrefs/Moz
  scoring.ts                # category + overall score
  fetchers/                 # shared cached http, PageSpeed, Places, Trustpilot
```

Each check is a pure function: `(business, fetched) => CheckResult`. Trivially unit-testable on fixtures. No randomness.

### 9.3 Part B — AI Spot Check v2 (LLM observation, hardened)

We keep the LLM-output observation as a secondary metric, but isolate and bound its uncertainty.

**Sources of uncertainty and how we address each:**

| Source | Magnitude | Fix |
|---|---|---|
| Model sampling at temp 0.7 | High | `temperature: 0` |
| Silent model upgrades (alias rotation) | High | Pin explicit version (`gpt-4o-mini-2024-07-18`); track `system_fingerprint` |
| Per-call non-determinism even at temp 0 | Medium | Pass `seed: <fixed>` |
| Prompt phrasing sensitivity | Medium | Small fixed paraphrase set (3 per intent) |
| LLM-as-judge extractor variance | High | Replace `targetAppears` boolean with deterministic fuzzy name match (Jaro-Winkler ≥ 0.85) |
| Evidence-request suffix biasing answers | Medium | Remove — clean prompts only |
| Time-of-day variance | Low | Fixed cadence (02:00 UTC weekly) |
| Knowledge cutoff drift | Medium | Disclose model + cutoff in UI; not eliminable |

**Tier 1 (must-do, ~1-2 days):**
1. `temperature: 0` everywhere in observation path
2. Pin model versions in env (`OPENAI_OBSERVATION_MODEL=gpt-4o-mini-2024-07-18`)
3. Pass `seed` parameter on every call (constant per business: `seed = hash(businessId)`)
4. Capture + store `system_fingerprint` per run; flag snapshots when it changes
5. Replace LLM `targetAppears` with deterministic fuzzy name match against `rawAnswer`; LLM extraction kept only for soft fields (reasons, sentiment)
6. Drop `withEvidenceRequest()` suffix from `src/lib/prompts.ts`
7. Fixed weekly cadence at 02:00 UTC (drives monitoring scheduler)

**Tier 2 (~3-4 days):**
8. N=5 samples per (prompt × business) call
9. Report bootstrap 95% CI alongside every point estimate
10. 3 fixed paraphrases per intent — separates phrasing variance from model variance
11. Dashboard: show raw answer with target name highlighted for every reported appearance (client can verify)

**Tier 3 (defer to v2.1):**
12. Reference-business calibration (run same check against 2-3 canonical stable businesses; subtract their delta from client's)
13. Cohort baselining (percentile vs. vertical+geo cohort)
14. Multi-model ensemble (gpt-4o-mini + gpt-4o + claude-haiku — report agreement)

**What the customer sees:**

```
AI Spot Check — ChatGPT
Model: gpt-4o-mini-2024-07-18  |  Seed: 7421  |  Temp: 0
Fingerprint: fp_8f3e2a (unchanged ✓)  |  Last run: 2026-05-22 02:00 UTC

"best dentist in Woking"          → 4/5 (80%, CI 38-99%)
"top-rated dentist in Woking"     → 3/5 (60%, CI 23-92%)
"recommend a dentist near Woking" → 5/5 (100%, CI 57-100%)

Combined: 12/15 appearances (80%) — avg rank #2 when mentioned
[View raw answers with name highlighted]
```

**Cost:** 3 paraphrases × 5 samples = 15 calls × ($0.0003 answer + $0.0003 extraction) ≈ **$0.009 per spot check per provider**. Per week, per business, all providers: ~$0.03. Trivial.

### 9.4 What to delete

- `src/lib/prompts.ts` — `generatePromptsForBusiness()` replaced by fixed paraphrase set per intent (lives in audit suite registry)
- `withEvidenceRequest()` — removed
- LLM-graded `targetAppears` extraction path — `processPromptRun` keeps the LLM call only for soft fields
- (BullMQ worker is retained — see §9.6 — used to fan out audit checks + spot-check sample batches asynchronously)

### 9.5 Migration path

| Week | Work |
|---|---|
| 1 | `AuditCheck` registry seeded (~52 checks); fetcher layer (http+cache, PageSpeed, Places); `AuditRun` schema migration |
| 2 | Implement categories 1 + 2 (crawler config + structured data) — pure parsing, no external APIs |
| 3 | Implement categories 3 + 4 (GBP + site signals) — adds PageSpeed + Places API |
| 4 | Implement category 5 (off-site citations + reviews); scoring algorithm + thresholds; new dashboard view |
| 5 | Spot Check v2 — Tier 1 hardening (temp=0, pinned model, seed, deterministic name match, drop suffix, fingerprint tracking) |
| 6 | Spot Check v2 — Tier 2 (N=5 sampling, CIs, paraphrases, raw-answer highlighting); vertical-specific check packs (dentist, accountant) |

Old `VisibilitySnapshot` rows preserved with `methodology: "legacy-llm-v1"` flag; new audits write to `AuditRun` + a v2 spot-check table.

### 9.6 Decisions & remaining open questions

**Decided (2026-05-22):**

1. **Ahrefs/Moz: defer.** Category 6 (Authority & Link Profile) is **not in v1**. The 48 checks across categories 1-5 ship without paid authority data. Revisit in v1.1 if customers explicitly ask for backlink signals.
2. **BullMQ: keep.** Worker stays. Used to fan out audit checks (categories run in parallel jobs) and spot-check sample batches (the 15 LLM calls per spot check fan out across worker concurrency). Redis stays as a dependency.
3. **Demo seeding: show both metrics.** Re-seed demo businesses (`prisma/seed.ts`) so the landing page and dashboard surface **both AI Readiness Score and AI Spot Check** side by side. Target the "instructive but not embarrassing" range — roughly 60-75/100 with 3-5 visible failing checks (clear fix opportunities), and a Spot Check showing partial visibility (e.g. 8/15 appearances) so both metrics have headroom to demonstrate value.

**Still open:**

4. Initial thresholds (e.g. "≥20 reviews" vs "≥10", LCP <2.5s vs <3.0s) are guesses — must refine against the first 10 real audits with agency feedback before locking v1 numbers.
