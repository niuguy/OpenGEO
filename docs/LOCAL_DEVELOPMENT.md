# Local Development

## Prerequisites

- Node.js 22+
- pnpm
- Docker Desktop or another Docker runtime

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

Open http://localhost:3000.

## Worker

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
