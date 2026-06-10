# OpenGEO

OpenGEO is an open-source AI search visibility tracker for local businesses, agencies, and operators who want to understand how brands appear in ChatGPT, Gemini, and Google AI Overview-style answers.

It answers a practical question:

> When someone asks an AI assistant for local recommendations, does this business appear, who appears instead, why, and which reference signals are mentioned?

OpenGEO is observation-first. It measures AI answer behavior and competitive visibility; it does not promise guaranteed ranking improvements.

## What It Does

- Generate diversified local-intent prompts for a business, category, and location.
- Run prompt samples against ChatGPT-style OpenAI models, Gemini, and optional Google AI Overview-compatible search data.
- Extract mentioned businesses, observed ranks, sentiment, reasons, semantic attributes, and model-mentioned reference signals.
- Track visibility snapshots over time.
- Compare target businesses against local competitors.
- Crawl public websites for a small local business audit.
- Discover local prospects through the official Google Places API.
- Export customer-facing reports.

## OpenGEO vs SEO Suites

Traditional SEO tools measure search rankings, backlinks, and keyword demand. OpenGEO focuses on generative engine observation:

- AI recommendation frequency
- AI answer share of voice
- competitor displacement
- prompt cluster visibility
- reference signals that models mention
- answer variance across samples and providers

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Postgres via Prisma
- Redis + BullMQ for queued background runs
- OpenAI API for answer sampling and structured extraction
- Google Gemini API for Gemini answer sampling
- Optional SearchAPI-compatible connector for Google AI Overview-style results
- Optional Google Places API for prospect discovery
- Vitest for focused tests

## Quickstart

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for the full local setup.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

Open http://localhost:3000.

Start the background worker in a second terminal when you want queued prompt checks:

```bash
pnpm worker
```

## Required API Keys

For basic ChatGPT-style runs:

```bash
OPENAI_API_KEY="sk-..."
OBSERVATION_PROVIDERS="chatgpt"
```

To sample Gemini too:

```bash
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-2.5-flash"
OBSERVATION_PROVIDERS="chatgpt,gemini"
```

For optional Google AI Overview-style observation:

```bash
SEARCHAPI_API_KEY="..."
SEARCHAPI_BASE_URL="https://www.searchapi.io/api/v1/search"
GOOGLE_AIO_GL="uk"
GOOGLE_AIO_HL="en"
OBSERVATION_PROVIDERS="chatgpt,gemini,google_ai_overview"
```

For optional local prospect discovery:

```bash
GOOGLE_PLACES_API_KEY="..."
GOOGLE_PLACES_REGION_CODE="GB"
GOOGLE_PLACES_LANGUAGE_CODE="en"
```

## Main Workflows

### AI Visibility Audit

1. Open `/businesses/new`.
2. Create a local business audit.
3. Generate prompts from the dashboard.
4. Run provider samples.
5. Review visibility score, observed position, recommendation consistency, competitor comparison, semantic attributes, reference signals, volatility, and raw answers.

### Audit Machine

Open `/audit-machine` to turn a public website URL into a repeatable audit workflow:

1. Crawl a small same-origin page set.
2. Infer business name, category, location, and attributes.
3. Create the business audit.
4. Generate a diversified prompt set.
5. Run provider samples.

### Prospect Discovery

Open `/prospecting` or run the outreach crawler to discover local business prospects through Google Places and crawl public contact data.

```bash
OUTREACH_CATEGORY="dentist" \
OUTREACH_LOCATION="Woking, Surrey" \
OUTREACH_LIMIT=10 \
OUTREACH_MAX_PAGES=8 \
pnpm outreach:crawl
```

OpenGEO does not scrape Google Maps pages and does not submit forms automatically.

## Sampling Methodology

OpenGEO sends a user-like prompt to the answer provider first. It does not leak the target business, competitors, or attributes into the answer-generation call.

```text
user-like prompt -> answer provider -> raw answer
raw answer + known business context -> structured extraction -> OpenGEO metrics
```

Prompt coverage uses stratified sampling instead of pure random prompt generation. Prompts are grouped by cluster and tagged with metadata such as intent, location style, specificity, persona, wording style, and decision mode.

Repeated samples capture answer variance. OpenGEO reports recommendation frequency, observed rank, consistency, share of voice, semantic attributes, competitor displacement, and source/reference signal mentions.

## Self-Hosting

Supported first-class path:

- Docker Compose for Postgres + Redis + local Next.js runtime.

Useful deployment path:

- Vercel for the dynamic Next.js app with hosted Postgres, plus a separate worker host for `pnpm worker`.

See:

- [docs/SELF_HOSTING_DOCKER.md](docs/SELF_HOSTING_DOCKER.md)
- [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)

## Agent Skills

OpenGEO ships initial agent skill definitions in `.agents/skills`. They are intended for Codex, Claude Code, and other skill-aware coding agents.

Planned skill workflows:

- `geo-project-setup`
- `ai-visibility-audit`
- `competitor-geo-analysis`
- `local-business-prompt-research`
- `geo-report-review`
- `lead-prospecting`

## MCP Direction

The next major platform step is an OpenGEO MCP server so agents can inspect projects, run prompt checks, read visibility reports, compare competitors, and prepare client-facing GEO recommendations directly from a self-hosted OpenGEO instance.

## Demo Data

Seed data is for local development only. Any fictional/demo business should be treated as placeholder data and not used as a real testimonial or customer claim.

## Telemetry

Telemetry is local by default. Events are stored in the `TelemetryEvent` table and can be inspected at:

```text
/api/telemetry
```

Disable local telemetry recording with:

```bash
TELEMETRY_ENABLED="false"
```

OpenGEO does not store request-supplied OpenAI API keys.

## Tests

```bash
pnpm test
```

Current tests cover prompt generation, structured extraction schema validation, optional Langfuse mode, OpenAI wrapper flow, trace ID persistence, and local GEO metric calculation.

## Open-Core Direction

Open-source:

- prompt generation
- provider answer runs
- structured extraction
- GEO scoring
- local dashboard
- local reports
- seed/demo data
- agent skills

Managed or paid later:

- hosted monitoring
- agency/client workspaces
- white-label reports
- vertical prompt packs
- competitor benchmarks
- scheduled alerts
- hosted MCP
