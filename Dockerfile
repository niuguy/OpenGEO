# Shared image for the web app and the BullMQ worker. The worker runs
# src/worker.ts through tsx, so dev dependencies stay in the final image —
# self-hosting simplicity wins over image size here.
FROM node:24-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Prisma engines need OpenSSL at generate and run time.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .

# next build must not touch a database: every page that queries Prisma is
# force-dynamic. The dummy URL only satisfies Prisma client initialization.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
