# Deploying on Vercel

Vercel is a good fit for the dynamic Next.js app: pages, API routes, database-backed dashboards, and report generation.

The current BullMQ worker is not an always-on Vercel function. Use one of these options:

1. Deploy the web app to Vercel and run `pnpm worker` on Railway, Fly.io, Render, a VPS, or another persistent worker host.
2. Refactor queued jobs to Vercel Queues or Vercel Workflow.
3. Keep the app fully Docker-based until the queue layer is refactored.

## Environment Variables

Set at least:

```bash
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
OPENAI_API_KEY="..."
OBSERVATION_PROVIDERS="chatgpt"
NEXT_PUBLIC_CONTACT_EMAIL="you@example.com"
```

Optional:

```bash
GEMINI_API_KEY="..."
SEARCHAPI_API_KEY="..."
GOOGLE_PLACES_API_KEY="..."
LANGFUSE_ENABLED="false"
```

## Database

Use hosted Postgres such as Neon, Supabase, Railway, or another provider reachable from Vercel.

For Prisma migrations, run:

```bash
pnpm prisma:generate
pnpm prisma migrate deploy
```

## Worker

Until the queue layer is refactored, run:

```bash
pnpm worker
```

on a persistent host that can reach the same `DATABASE_URL` and `REDIS_URL`.
