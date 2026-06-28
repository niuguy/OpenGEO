# Open Source GEO Platform Plan

Status: draft  
Goal: evolve OpenGEO from a local-business AI visibility tracker into an open-source GEO tool that can evaluate any brand, product, publisher, person, or organization.

## 1. Current State

OpenGEO already has a useful core:

- A self-hostable Next.js, Prisma, Postgres, Redis, and BullMQ application.
- Provider observation against ChatGPT-style OpenAI models, Gemini, and optional Google AI Overview-compatible search data.
- A hardened spot-check pipeline: pinned OpenAI observation model, temperature 0, deterministic seed, system fingerprint storage, raw answers, token usage, and structured extraction.
- Prompt review, custom prompts, queue/direct run modes, monitoring, visibility snapshots, source data, PDF reports, and local telemetry.
- Website crawl and profile inference that can bootstrap an audit from a URL.
- Local prospect discovery through Google Places and outreach crawling.
- A 48-check deterministic audit registry covering crawler configuration, structured data, Google Business Profile, site signals, and off-site citations.

The limiting factor is not the provider pipeline. It is the product model.

Today the root noun is `Business`, and the data model assumes:

- a local business
- a category
- a location
- local competitors
- local-intent recommendation prompts
- local citation and review signals

That is a strong first vertical, but it is too narrow for an open-source GEO platform that should work for all brands.

## 2. Product Direction

The target positioning:

> OpenGEO is an open-source GEO evaluation framework for measuring how AI systems discover, describe, compare, and recommend brands.

Local business should become the first mature profile type, not the whole product.

The platform should support:

- Local businesses
- SaaS companies
- ecommerce brands
- consumer brands
- publishers and media sites
- developer tools and open-source projects
- professional services firms
- people and personal brands
- enterprise brands

The shared job across all of these is:

1. Define the target entity.
2. Define the relevant market, audience, and competitor set.
3. Generate or import realistic AI-search prompts.
4. Run observations across providers.
5. Extract mentions, rankings, claims, sentiment, comparison reasons, and cited sources.
6. Run deterministic readiness checks against the target's web and entity signals.
7. Produce reports that separate observed model behavior from fixable readiness issues.

## 3. Architecture Shift

### 3.1 Rename the Product Nouns

Do not delete the existing `Business` model immediately. Add a compatibility layer first.

Target model direction:

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  targets     Target[]
}

model Target {
  id               String   @id @default(cuid())
  projectId         String
  name             String
  kind             String   // local_business | saas | ecommerce | publisher | person | org | developer_tool
  websiteUrl       String?
  marketCategory   String?
  geography        String?
  audience         String?
  attributes       String[]
  facts            Json?
  project          Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

Migration principle:

- Existing `Business` rows map to `Target.kind = "local_business"`.
- `Business.category` maps to `Target.marketCategory`.
- `Business.location` maps to `Target.geography`.
- `Business.targetAttributes` maps to `Target.attributes`.

The first implementation can keep `Business` and introduce adapter functions. A full database migration can happen after the new abstractions prove useful.

### 3.2 Generalize Competitors

Replace local `Competitor` semantics with compared entities.

Competitors should support:

- direct competitors
- substitute products
- category leaders
- comparison benchmarks
- publications or directories that often appear in answers
- canonical reference entities

Direction:

```prisma
model ComparedEntity {
  id        String  @id @default(cuid())
  targetId  String
  name      String
  kind      String? // competitor | substitute | benchmark | source | directory
  websiteUrl String?
  aliases   String[] // alternate names, abbreviations, product names
}
```

Aliases are a property of any entity, not just the target. Share of Voice depends on
matching competitor mentions, and competitor names are exactly as alias-prone as the
target's ("VS Code" / "Visual Studio Code", "GA4" / "Google Analytics"). If compared
entities stay name-exact while the target gets alias matching, Share of Voice silently
inflates in the target's favor.

### 3.3 Replace Business Prompt Generation With Prompt Packs

Current `generatePromptsForBusiness()` should become one prompt pack: `local-business`.

Introduce a prompt pack interface:

```ts
type PromptPackInput = {
  targetName: string;
  targetKind: string;
  marketCategory?: string;
  geography?: string;
  audience?: string;
  attributes: string[];
  comparedEntities: string[];
};

type PromptPack = {
  id: string;
  label: string;
  targetKinds: string[];
  generate(input: PromptPackInput): GeneratedPrompt[];
};
```

Initial packs:

- `local-business`: current local-intent prompts.
- `brand-reputation`: prompts about awareness, sentiment, trust, and claims.
- `product-comparison`: prompts comparing target against named competitors.
- `category-recommendation`: prompts asking which tools, products, or brands to choose.
- `buyer-research`: prompts used by prospects evaluating vendors.
- `docs-discovery`: prompts for developer tools and technical products.

The first non-local pack should be `product-comparison` or `brand-reputation` because it reuses the current extraction and competitor logic with minimal new infrastructure.

#### Deterministic templates vs. LLM-generated prompts

This is an explicit design decision, not an implementation detail. The current local
generator is deterministic templates with `samplingBasis` metadata, and the platform's
core promise is reproducible audits (pinned models, temperature 0, seeds, fingerprints).
Non-local packs for arbitrary categories will be tempted toward LLM-assisted prompt
generation to sound realistic.

Decision: packs support two modes.

1. **Deterministic template mode** (default): pure functions of `PromptPackInput`,
   reproducible byte-for-byte. All initial packs ship in this mode.
2. **LLM-expanded mode** (optional, later): an LLM proposes additional prompts, but they
   are frozen at prompt-review time — the existing review/approval gate is the point
   where generated prompts become fixed inputs. Reproducibility applies from approval
   onward, and the prompt record stores which mode produced it.

Pack output must remain `GeneratedPrompt[]` with first-class `samplingBasis` metadata.
Non-local packs define their own basis vocabulary (e.g. buyer stage instead of
locationStyle), but the stratified-sampling audit trail is not optional.

### 3.4 Generalize Extraction

Current extraction is business-oriented. The generalized schema should extract entities and claims.

Direction:

```ts
type GeoExtraction = {
  targetMentioned: boolean;
  targetRank: number | null;
  sentiment: "positive" | "neutral" | "negative" | "unknown";
  mentionedEntities: {
    name: string;
    kind?: string;
    rank: number | null;
    sentiment: string;
    reasons: string[];
  }[];
  claims: {
    text: string;
    about: string[];
    polarity: "positive" | "negative" | "neutral";
    evidence?: string;
  }[];
  sources: {
    type: string;
    label: string;
    url?: string;
    evidence?: string;
    mentionedForEntities: string[];
  }[];
  semanticAttributes: {
    label: string;
    evidence?: string;
  }[];
};
```

Keep deterministic name matching, and apply it uniformly to the target *and* compared
entities (see 3.2 — alias-matching only the target skews Share of Voice). Add:

- `TargetAlias` for the target, `ComparedEntity.aliases` for everyone else
- domain match hints
- known product names
- optional exact-match protected names

### 3.5 Split Readiness Checks Into Generic and Pack-Specific Checks

The existing 48-check registry is valuable, but most of it is local-business biased.

Create check layers:

1. Generic web readiness
   - robots.txt
   - AI crawler directives
   - sitemap
   - llms.txt
   - canonical URLs
   - schema.org presence
   - Open Graph and social metadata
   - page titles and descriptions
   - crawlability

2. Entity readiness
   - Organization schema
   - sameAs links
   - About page
   - contact page
   - canonical brand facts
   - product/service pages
   - author or team pages when relevant

3. Profile-specific packs
   - Local business: LocalBusiness schema, GBP, local citations, reviews, NAP consistency.
   - SaaS: pricing page, docs, integrations, security/compliance pages, case studies, comparison pages.
   - Ecommerce: Product schema, reviews, availability, shipping/returns, marketplace presence.
   - Publisher: Article schema, author schema, topical authority, RSS/sitemap freshness.
   - Developer tool: docs structure, README, GitHub metadata, package registry metadata, examples.

Implement deterministic readiness as a real runtime feature:

- Add `AuditCheck`, `AuditRun`, and `AuditCheckResult` schema.
- Seed the registry.
- Build a check orchestrator.
- Store check evidence and fix guidance.
- Surface readiness score separately from AI spot-check results.

## 4. Open Source Product Shape

The open-source version should be useful as a self-hosted project.

First-class open-source surfaces:

- Web app: current Next.js UI.
- CLI:
  - `opengeo init`
  - `opengeo audit`
  - `opengeo run`
  - `opengeo export`
- Config file:

```ts
export default {
  target: {
    name: "Example Brand",
    kind: "saas",
    websiteUrl: "https://example.com",
    marketCategory: "customer support software",
    audience: "B2B SaaS teams",
    attributes: ["AI automation", "enterprise support"]
  },
  comparedEntities: ["Intercom", "Zendesk", "Freshdesk"],
  promptPacks: ["brand-reputation", "product-comparison", "buyer-research"],
  providers: ["chatgpt", "gemini"]
};
```

- JSON import/export for runs and reports.
- MCP server so agents can inspect projects, run audits, compare entities, and prepare recommendations.
- Docker Compose as the default self-hosting path.

## 5. Phased Roadmap

### Phase 1: Naming and Adapter Layer

Goal: prepare the codebase for non-local targets without breaking the current app.

Tasks:

- Add internal `TargetProfile` TypeScript types.
- Add adapter from `Business` to `TargetProfile`.
- Rename user-facing copy from "business" to "target" or "brand" where it does not hurt the existing local flow.
- Keep `/businesses` routes for now, but introduce neutral library functions.
- Add tests proving local business prompt generation still behaves the same through the adapter.

Exit criteria:

- Existing local demo still works.
- No database migration required yet.
- New code paths can accept a generic target profile.

### Phase 2: Prompt Pack System

Goal: make local prompts one pack among several.

Tasks:

- Create `src/lib/prompts/packs/`.
- Move current generator into `local-business.ts`.
- Add `brand-reputation.ts`.
- Add `product-comparison.ts`.
- Add registry and selection logic.
- Store prompt pack id and prompt metadata on generated prompts.

Exit criteria:

- A non-local target can generate meaningful prompts **and run them end to end** through
  the existing extraction and metrics pipeline — observation, extraction, and a
  visibility snapshot, even if extraction quality is imperfect for non-local entities.
  Generation alone is not done; running real answers through the current
  business-shaped extraction is how the Phase 3 gaps get discovered with evidence
  instead of designed speculatively.
- Prompt review UI works for both local and non-local prompts.
- Existing local prompt tests still pass.

### Phase 3: Generalized Extraction

Goal: stop assuming every mentioned entity is a local business.

Tasks:

- Introduce generalized extraction schema.
- Keep compatibility mapping into current `ExtractionResult` tables.
- Add aliases for the target and compared entities; extend deterministic name matching
  to alias/domain matching for both.
- Add tests for SaaS/product/publisher examples.
- Generalize the metrics and dashboard layer enough to *view* a non-local target:
  - `calculateGeoMetrics()` in `src/lib/geo-metrics.ts` should consume the generalized
    extraction (mentioned entities, not mentioned businesses).
  - `VisibilitySnapshot` and `src/lib/dashboard.ts` queries need a target-shaped path
    (via the adapter for now, real foreign keys in Phase 5).
  - Dashboard copy and sections that assume local semantics (citations, GBP) should
    degrade gracefully for non-local kinds, not render as empty local widgets.

  This is deliberately scoped: adapt, don't rewrite (rewriting the dashboard stays a
  non-goal). But it must be planned work here — a non-local target that runs but cannot
  be viewed is not a usable exit from this phase.

Exit criteria:

- The pipeline can evaluate a SaaS or ecommerce brand without local fields.
- Metrics still calculate target appearances, share of voice, rank, sentiment, and cited sources.
- The dashboard renders a coherent report for a non-local target.

### Phase 4: Deterministic Readiness Runtime

Goal: turn the existing check registry into the headline deterministic audit surface.

Tasks:

- Add `AuditCheck`, `AuditRun`, and `AuditCheckResult` models.
- Seed generic checks.
- Build fetcher layer for robots, sitemap, pages, schema, and metadata.
- Implement generic web readiness checks first.
- Add local-business check pack afterward.
- Add readiness dashboard section and report export.

Exit criteria:

- A target website gets a reproducible readiness score.
- Each failed check includes evidence and fix guidance.
- AI spot-check and readiness score are clearly separated.

### Phase 5: Generic Project Model

Goal: move from compatibility to the real multi-target model.

Tasks:

- Add `Project`, `Target`, `ComparedEntity`, and `TargetAlias` tables.
- Backfill existing `Business` rows into local-business targets.
- Migrate prompts, runs, snapshots, and audits to target ids.
- Keep legacy redirects from `/businesses/:id`.
- Update dashboard and APIs to use projects/targets.

Exit criteria:

- Local businesses are just one target kind.
- New target kinds can be created without schema changes.

### Phase 6: OSS Distribution

Goal: make OpenGEO useful as a developer-first open-source tool.

Tasks:

- Add CLI wrapper.
- Add `opengeo.config.ts` support.
- Add JSON import/export.
- Add MCP server.
- Add example configs for local business, SaaS, ecommerce, publisher, and developer tool.
- Update README around the broader positioning.

Exit criteria:

- A user can clone the repo, define a target in config, run an audit, and export results without touching the web UI.

## 6. Recommended Next Build

Build Phase 1 and Phase 2 together as the next concrete step:

1. Add `TargetProfile` and `PromptPack` abstractions.
2. Move the current local prompt generator into a `local-business` pack.
3. Add one non-local pack: `brand-reputation`.
4. Add one demo non-local target in seed data.
5. Update README wording from "local businesses" to "brands, with local business as the first profile."

This is the smallest useful move toward the larger goal. It proves the architecture can support all brands while preserving the working local-business product.

## 7. Non-Goals For Now

Avoid these until the generic model is proven:

- Full account/workspace work.
- Enterprise benchmark datasets.
- A complete schema migration away from `Business` in the first pass.
- Rewriting the dashboard from scratch.
- Adding many vertical packs before one non-local pack works end to end.

## 8. Success Criteria

OpenGEO is on the right path when:

- The local-business demo still works.
- A SaaS or ecommerce brand can be audited without fake location fields.
- Prompt packs are selectable and inspectable.
- AI spot-check reports distinguish provider observations from deterministic readiness.
- Readiness checks produce repeatable evidence and fixes.
- The project can be used from CLI/config, not only the web UI.
- New target kinds can be added by adding prompt/check packs, not by rewriting core code.

## 9. UX: Tool-First Front Door (OSS)

The home page should be a working product surface, not a marketing page. For
OSS, the audit tool should be the first thing you see.

### Decisions (locked)

- **Tool as home page.** `/` renders the audit tool directly, not a marketing landing.
- **Drop the static demo.** The tool needs a backend (DB + `/api`); the static
  Cloudflare export can't run it. Stop maintaining the static export rather than ship
  a tool with dead buttons.

### Changes

1. **Home page becomes the tool — `src/app/page.tsx`**
   - Render `<AuditMachine mode="website-only" />` as the primary content (moved from
     `audit-machine/page.tsx`), with `export const dynamic = "force-dynamic"` so the
     recent-audits list is live and `pnpm build` doesn't need a live DB.
   - Keep a short hero (unified title + one-line description) and a **secondary**
     "view sample report" link to the demo business when it exists.
   - Move the "Recent Website Audits" list here.
   - Remove: `ContactForm` import + `#inquiry` section; the dark agency/sales section;
     the `DemoReportCard` marketing visual.

2. **Delete the duplicate route — `src/app/audit-machine/`** (content now lives at `/`).

3. **Nav — `src/app/layout.tsx`**
   - "Audit Tool" → **Audit** → `/`
   - "My Reports" → **Reports** → `/businesses`
   - Replace "New Analysis → /#inquiry" with **GitHub** → `https://github.com/niuguy/OpenGEO`

4. **Reports list — `src/app/businesses/page.tsx`**
   - `h1` "Audits" → "Reports" (match the nav).
   - "New audit" button: `/#inquiry` → `/`.

5. **Drop static-export machinery** (since `/` now needs a backend)
   - Delete `scripts/build-static-export.ts`.
   - `next.config.ts`: remove the `STATIC_EXPORT` `output: "export"` branch.
   - Remove the `STATIC_EXPORT` `generateStaticParams` guards in
     `businesses/[id]/page.tsx` and `businesses/[id]/runs/page.tsx` (delete the
     functions; also drop the now-unused `prisma` import in `[id]/page.tsx`).
   - `package.json`: remove `cloudflare:next-export`, `cloudflare:export`,
     `cloudflare:deploy`, and `demo:export` scripts.

6. **Delete dead code**
   - `src/components/contact-form.tsx` and `src/app/api/inquiries/route.ts`.
   - `src/components/demo-report-card.tsx`.
   - `scripts/export-cloudflare-demo.ts`.
   - Drop the `wrangler` and `@cloudflare/workerd-darwin-arm64` devDeps (touches
     `pnpm-lock.yaml` — run `pnpm install` to resync).

### Verification

- `pnpm build` clean; `/` shows as `ƒ (Dynamic)`; `/audit-machine` and `/api/inquiries`
  gone from the route table.
- `pnpm test` green.
- Dev: `/` shows the audit tool; pasting a URL runs an audit; nav routes to Reports +
  GitHub; sample link opens the demo report.

### Out of scope

- README rewrite for OSS onboarding (separate pass).
- Visual polish beyond fixing naming drift.

> Note: this exact change was prototyped and verified in a sibling clone (`nearbyAI`,
> same base commit `709bad6`): `pnpm build` clean with `/` dynamic, `pnpm test` 55/55
> green. That prototype was reverted; this is the plan to re-apply it here in OpenGEO.
