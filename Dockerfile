# Stage 1: Base
FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS install

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

FROM base AS prerelease
WORKDIR /app

COPY --from=install /app/node_modules ./node_modules
COPY . .

# Generate Prisma client and run migrations
RUN bunx --bun prisma migrate deploy
RUN bunx --bun prisma generate

ENV NODE_ENV=production
RUN bun run build:file

FROM base AS release
WORKDIR /app

COPY --from=prerelease --chown=bun:bun /app/out/server .

USER bun
EXPOSE 3000/tcp

ENTRYPOINT ["./server"]