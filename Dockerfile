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

ENV NODE_ENV=production
RUN bun run build:file

FROM gcr.io/distroless/static-debian12 AS release
WORKDIR /app

COPY --from=prerelease /app/out/server .

USER nonroot:nonroot

EXPOSE 3000/tcp
ENTRYPOINT ["./server"]