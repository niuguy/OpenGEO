# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Next.js dev server (localhost:3000)
pnpm build            # prisma generate && next build
pnpm worker           # BullMQ background worker (concurrency: 2)
pnpm lint             # ESLint
pnpm test             # Vitest (src/**/*.test.ts)
pnpm test:watch       # Vitest watch mode
pnpm prisma:migrate   # Run pending migrations
pnpm prisma:seed      # Seed two demo businesses: dentist (Woking) + accountant (London)
pnpm db:reset         # Full Prisma reset (destructive)
```

The worker process must run alongside `pnpm dev` when testing queued prompt runs. Direct runs (user pastes API key in UI) don't need the worker.

## Architecture

This is an AI visibility observation platform: it samples local-intent prompts across AI providers (ChatGPT, Gemini, Google AI Overviews), extracts structured recommendation data from answers, and computes visibility metrics for local businesses vs. their competitors.

### Data pipeline (the core flow)

Every audit follows three phases in sequence:

1. **Answer generation** — prompt is sent to the AI provider *without* any business context, simulating a real consumer query. This is intentional: leaking the target business name would bias the response.
2. **Structured extraction** — the raw answer is re-sent to OpenAI with business context (name, competitors, attributes) using `json_schema` strict mode to extract: `targetAppears`, `targetRank`, `sentiment`, `reasons`, `sources`, `mentionedBusinesses`, `semanticAttributes`, `referenceSignals`, `confidence`.
3. **Metrics calculation** — `calculateGeoMetrics()` in `src/lib/geo-metrics.ts` aggregates extraction results into a `VisibilitySnapshot` per provider.

Key files for this flow: `src/lib/prompts.ts` → `src/lib/process-prompt-job.ts` → `src/lib/geo-metrics.ts` → `src/lib/dashboard.ts`

### Two execution modes

- **Direct**: `POST /api/businesses/[id]/run-prompts` with an API key in the request body. Runs synchronously in the API route.
- **Queued**: Same endpoint without a key uses `OPENAI_API_KEY` from env and enqueues a BullMQ job. The worker (`src/worker.ts`) processes jobs with 2 concurrent workers and 2 retry attempts with exponential backoff.

### Prompt generation

`generatePromptsForBusiness()` in `src/lib/prompts.ts` creates a stratified set of prompts across intent clusters: best-local, choice, recommend, top-rated, affordable, family-friendly, same-day, attribute-specific, and comparison prompts (target vs. market, target vs. competitors, head-to-head). Each prompt stores `samplingBasis` metadata (intent, locationStyle, specificity, persona, wordingStyle, decisionMode) as JSON. Prompts are deduplicated by lowercased text before storage.

### Multi-vertical support

The platform is category-agnostic at the data model and pipeline level. `getEvidenceSignalHints(category)` in `src/lib/prompts.ts` maps category keywords to appropriate reference signal descriptions (e.g. "ICAEW/ACCA directories" for accountants, "NHS listings" for healthcare, generic fallback for everything else). Reference signal `sourceType` values use generic terms: `business_website`, `professional_directory`, `industry_listing` — not healthcare-specific names. Initial target verticals are dentists and accountants; adding a new vertical means adding a branch in `getEvidenceSignalHints`.

### Provider abstraction

`src/lib/ai/providers.ts` defines the `ObservationProvider` type. Gemini is accessed via Google's OpenAI-compatible endpoint (same `openai` SDK, different base URL). Google AI Overviews use SearchAPI.io as a wrapper since there's no official Google API. Langfuse tracing wraps the OpenAI client optionally via `@langfuse/openai` — it's disabled by default and Postgres remains the source of truth for all metrics.

### Metrics

All scoring lives in `src/lib/geo-metrics.ts`:
- **Visibility Rate**: % prompts where target appears
- **Share of Voice**: target mentions / (target + all competitor mentions)
- **Position-Weighted Visibility**: harmonic mean of ranks when target appears
- **Consistency**: per-prompt agreement across multiple samples
- **Volatility**: binomial variance of appearances across prompts
- **Reliability Score**: `sampleCoverage × (1 − volatility/100)` — honest about confidence

`averageRank` is null when AI answers don't explicitly state ordinal positions (common with prose answers — a known gap).

### App Router structure

```
app/
  page.tsx                     # Landing page
  businesses/[id]/             # Visibility report dashboard
  businesses/[id]/runs/        # Raw prompt run results
  audit-machine/               # Website crawl → auto-infer business
  audit-machine/leads/         # Google Places prospect discovery
  prospecting/                 # Outreach crawl results
  api/                         # Route handlers (no separate server)
```

### Database

Postgres via Prisma. Key relationships:
- `Business` → `Competitor[]`, `Prompt[]`, `VisibilitySnapshot[]`, `WebsiteAudit`
- `Prompt` → `PromptRun[]`
- `PromptRun` → `ExtractionResult` (1:1)
- `ExtractionResult` → `MentionedBusiness[]`, `ReferenceSignal[]`, `SemanticAttribute[]`

`VisibilitySnapshot` is written after every completed run via `refreshVisibilitySnapshot()` and is the primary source for dashboard queries (not live-aggregated).

## Required environment variables

```bash
DATABASE_URL               # Postgres
REDIS_URL                  # Redis (default: redis://localhost:6379)
OPENAI_API_KEY             # Required for worker mode
GEMINI_API_KEY             # Optional, for Gemini provider
SEARCHAPI_API_KEY          # Optional, for Google AI Overview provider
OBSERVATION_PROVIDERS      # Comma-separated: chatgpt,gemini,google_ai_overview
OPENAI_MODEL               # Default: gpt-4o-mini
EXTRACTION_MODEL           # Default: gpt-4o-mini
LANGFUSE_ENABLED           # Default: false
```

## Testing

Tests cover prompt generation (`src/lib/__tests__/prompts.test.ts`), metrics calculation (`src/lib/geo-metrics.test.ts`), and job processing (`src/lib/process-prompt-job.test.ts`). Run a single test file: `pnpm test src/lib/geo-metrics.test.ts`.

Path alias `@/*` maps to `src/*` in both TypeScript and Vitest.

## gstack

For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:

- `/office-hours`
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/design-consultation`
- `/design-shotgun`
- `/design-html`
- `/review`
- `/ship`
- `/land-and-deploy`
- `/canary`
- `/benchmark`
- `/browse`
- `/connect-chrome`
- `/qa`
- `/qa-only`
- `/design-review`
- `/setup-browser-cookies`
- `/setup-deploy`
- `/setup-gbrain`
- `/retro`
- `/investigate`
- `/document-release`
- `/document-generate`
- `/codex`
- `/cso`
- `/autoplan`
- `/plan-devex-review`
- `/devex-review`
- `/careful`
- `/freeze`
- `/guard`
- `/unfreeze`
- `/gstack-upgrade`
- `/learn`
