# Docker Self-Hosting

The current self-hosting path uses Docker Compose for Postgres and Redis, with the Next.js app and worker running from the checkout.

## Quickstart

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm prisma:migrate
pnpm prisma:seed
pnpm build
pnpm start
```

In a second process, run:

```bash
pnpm worker
```

## Network Exposure

The default setup is intended for trusted local or private use. Before exposing a deployment to the internet, add authentication, review secrets, and decide how user/API keys should be handled.

## Storage

OpenGEO stores product data in Postgres:

- businesses
- competitors
- prompts
- prompt runs
- structured extraction results
- reference signals
- visibility snapshots
- website audits
- lead prospects

Redis is used for BullMQ job queues.
