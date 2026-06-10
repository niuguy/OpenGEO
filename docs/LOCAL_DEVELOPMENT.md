# Local Development

## Prerequisites

- Docker Desktop or another Docker runtime
- Node.js 22+ and pnpm (only for dev mode / running tests on the host)

## Docker (everything in containers)

One command starts the full stack: Postgres, Redis, database migrations, the
web app on http://localhost:3000, and the BullMQ worker.

```bash
cp .env.example .env   # add OPENAI_API_KEY at minimum
docker compose up -d --build
```

Optionally load the demo data (two local businesses + one SaaS target):

```bash
docker compose run --rm app pnpm prisma:seed
```

Rebuild after pulling new code with `docker compose up -d --build`. Logs:
`docker compose logs -f app worker`.

## Dev mode (app and worker on the host)

Run only the data services in Docker and everything else with hot reload:

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

Open http://localhost:3000. Stop the Docker `app` service first if it is
running, otherwise port 3000 is taken.

### Worker

Queued prompt runs and monitoring sweeps use Redis + BullMQ.

Run the worker in a second terminal:

```bash
pnpm worker
```

## Provider Keys

At minimum, set:

```bash
OPENAI_API_KEY="sk-..."
OBSERVATION_PROVIDERS="chatgpt"
```

Gemini is optional:

```bash
GEMINI_API_KEY="..."
OBSERVATION_PROVIDERS="chatgpt,gemini"
```

Google AI Overview-style observation is optional and uses a SearchAPI-compatible response shape:

```bash
SEARCHAPI_API_KEY="..."
OBSERVATION_PROVIDERS="chatgpt,gemini,google_ai_overview"
```

## Common Commands

```bash
pnpm test
pnpm prisma:migrate
pnpm prisma:seed
pnpm worker
pnpm outreach:crawl
```
