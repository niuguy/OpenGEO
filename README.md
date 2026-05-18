# Local AI Visibility Tracker

Open-source AI visibility observation for local SEO agencies.

The MVP answers: do ChatGPT, Gemini, or Google AI Overviews recommend a local business, for which prompts, against which competitors, why, and which reference signals are mentioned?

This is observation-first. It does not claim guaranteed ranking improvements.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Postgres via Prisma
- Redis + BullMQ for queued background runs
- OpenAI API for answers and structured extraction
- Google Gemini API for Gemini answer sampling
- Optional Google AI Overview connector for search-result AI Overviews
- Vitest for focused unit tests

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Add your OpenAI key to `.env` if you want queued worker runs:

```bash
OPENAI_API_KEY="sk-..."
```

Direct dashboard runs can also use a request-only key entered in the UI. That key is used for the request and is not stored.

The observation call intentionally sends only the user-like prompt to OpenAI. Business name, known competitors, and target attributes are used after the response for structured extraction and analysis, not as hidden context for the answer-generation call.

By default the app samples ChatGPT-style OpenAI answers only:

```bash
OBSERVATION_PROVIDERS="chatgpt"
```

To sample Gemini alongside ChatGPT, add a Google AI Studio key and include both providers:

```bash
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-2.5-flash"
OBSERVATION_PROVIDERS="chatgpt,gemini"
```

Google AI Overviews do not have an official public Google API. The app supports them as an optional search-result connector, currently using a SearchAPI-compatible response shape:

```bash
SEARCHAPI_API_KEY="..."
SEARCHAPI_BASE_URL="https://www.searchapi.io/api/v1/search"
GOOGLE_AIO_GL="uk"
GOOGLE_AIO_HL="en"
OBSERVATION_PROVIDERS="chatgpt,gemini,google_ai_overview"
```

Langfuse remains optional internal tracing. It is disabled by default and is not required for prompt sampling or product metrics:

```bash
LANGFUSE_ENABLED="false"
LANGFUSE_PUBLIC_KEY=""
LANGFUSE_SECRET_KEY=""
LANGFUSE_BASE_URL="https://cloud.langfuse.com"
```

To enable internal AI tracing, create Langfuse project credentials and set:

```bash
LANGFUSE_ENABLED="true"
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_BASE_URL="https://cloud.langfuse.com"
```

When enabled, Langfuse records AI interactions for observability. The application database stores local business entities, prompt clusters, sampled answers, extracted recommendation data, and customer-facing visibility metrics.

4. Start Postgres and Redis:

```bash
docker compose up -d
```

5. Run Prisma migration and seed:

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

6. Start the app:

```bash
pnpm dev
```

Open http://localhost:3000.

7. Optional: start the worker for queued prompt checks:

```bash
pnpm worker
```

8. Optional: increase repeated sampling per prompt:

```bash
PROMPT_SAMPLES_PER_RUN="3"
```

## MVP Flow

1. Open `/businesses/new`.
2. Create a local business audit.
3. Generate prompts from the dashboard.
4. Run checks:
   - Direct run: paste your OpenAI API key in the dashboard.
   - Queued run: set `OPENAI_API_KEY` in `.env` and run `pnpm worker`.
5. Review provider comparison, visibility score, average observed position, recommendation consistency, competitor comparison, semantic attributes, model-mentioned reference signals, volatility, source mentions, and raw answers.

## Audit Machine

Open `/audit-machine` to turn the app into a repeatable audit workflow.

Website audit:

1. Enter a public website URL.
2. The app crawls a small same-origin page set, extracts page titles, headings, body text, and schema types.
3. It infers a business name, category, location, and target attributes.
4. It creates a business audit and generates the diversified prompt set.
5. Run provider samples from the audit dashboard.

Prospect discovery:

1. Enter a category and location.
2. The app uses Google Places API to find local prospects and stores them in `LeadProspect`.
3. Use each prospect website as a starting point for an audit and pitch.

The app does not directly scrape Google Maps pages. Use the official Places API path:

```bash
GOOGLE_PLACES_API_KEY="..."
GOOGLE_PLACES_REGION_CODE="GB"
GOOGLE_PLACES_LANGUAGE_CODE="en"
```

The customer-facing dashboard does not expose Langfuse. Internal raw-run debug details may include Langfuse trace IDs and trace links for maintainers.

## Sampling Methodology

This project observes AI answer behavior; it does not grade whether ChatGPT, Gemini, or Google AI Overviews gave the objectively best local answer.

Prompt coverage is handled through stratified sampling rather than pure random generation. Prompts are grouped by cluster and tagged with sampling metadata such as intent, location style, specificity, persona, wording style, and decision mode. Repeated samples per prompt capture answer variance, then the app reports recommendation frequency and consistency.

Each generated prompt also asks the model to briefly explain why it recommends those businesses and to mention reference signals it used, such as Google Maps reviews, Trustpilot, clinic websites, NHS or private listings, local directories, opening hours, and service pages. The app treats these as model-mentioned signals, not independently verified citations unless the answer includes a concrete URL.

The API flow is:

```text
user-like prompt -> OpenAI API -> raw answer
raw answer + known business context -> structured extraction -> app metrics
```

This emulates a consumer local-intent question without leaking target business or competitor hints into the answer-generation request. Gemini and Google AI Overview runs use the same prompt set so provider-level differences are comparable.

## Architecture Boundary

Langfuse is optional internal observability only. It can capture raw prompts, raw model responses, model names, latency, token usage when available, and errors for prompt generation and structured extraction calls.

The product remains the local AI recommendation intelligence layer. Our Postgres database owns:

- business and competitor entities
- prompt clusters and diversified prompt variants
- repeated prompt samples
- answer provider for each sample
- validated structured extraction results
- model-mentioned reference signals and source mentions
- visibility rate
- average observed position
- competitor share of recommendations
- recommendation consistency
- semantic attribute frequency
- volatility score
- source mentions
- visibility snapshots and customer-facing reports

Do not use Langfuse as the only store for customer-facing business metrics.

## Seed Demo

The seed creates a Woking / Surrey dentist demo:

- Example Dental Clinic
- Bupa Dental Care Woking
- Portmore Dental
- Woking Dental Practice
- The Dental Practice Woking

## Telemetry

Telemetry is local by default. Events are stored in the `TelemetryEvent` table and can be inspected at:

```text
/api/telemetry
```

Set this to disable local telemetry recording:

```bash
TELEMETRY_ENABLED="false"
```

The app records product usage metrics such as business creation, prompt generation, prompt run completion/failure, and inquiry creation. It does not store request-supplied OpenAI API keys.

## Agency Inquiries

The landing page includes a contact form for managed setup, white-label reports, vertical prompt packs, or benchmark access. Inquiries are stored locally in the `AgencyInquiry` table.

Set the displayed contact email:

```bash
NEXT_PUBLIC_CONTACT_EMAIL="you@example.com"
```

## Tests

```bash
pnpm test
```

Current tests cover prompt generation, structured extraction schema validation, optional Langfuse mode, OpenAI wrapper flow, trace ID persistence, and local GEO metric calculation.

## Open-Core Direction

Open-source:

- prompt generation
- answer runs
- structured extraction
- scoring
- local dashboard
- seed demo

Paid or managed later:

- hosted monitoring
- agency/client workspaces
- white-label reports
- vertical prompt packs
- competitor benchmarks
- scheduled alerts
