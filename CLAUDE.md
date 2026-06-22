# TTM Backend

Table Tennis Team Management backend API.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL via Prisma ORM
- **Email**: Resend with React Email templates
- **Push notifications**: web-push (VAPID)
- **Validation**: Zod (`@hono/zod-validator`)
- **Auth**: JWT + Google OAuth2 (oslo), bcryptjs for passwords

## Commands

```bash
bun run dev           # Start DB + server with hot reload
bun run dev:db        # Start DB only (Docker) + seed
bun run db:migrate    # Run Prisma migrations and generate client
bun run db:seed       # Seed database
bun run lint          # Run ESLint
bun run build:file    # Compile to standalone binary at out/server
```

Tests use Bun's built-in test runner — run individual test files with `bun test <file>`.

## Architecture

```
Request → Controller (validate with Zod) → Service (business logic) → Prisma → PostgreSQL
```

- **`src/controller/`** — Route handlers, input validation, HTTP responses
- **`src/service/`** — Business logic, one service per domain
- **`src/validation/`** — Zod schemas shared by controllers
- **`src/lib/`** — Utilities (auth, db helpers, email, logger, etc.)
- **`src/prisma/`** — Schema, migrations, Prisma client
- **`src/types/`** — TypeScript type definitions
- **`src/emails/`** — React Email templates (excluded from tsconfig)
- **`src/test/`** — Test suites mirroring controller/service structure
- **`bruno/`** — API collection for manual testing

## Middleware Stack (applied globally)

1. Pino logger
2. CORS (origin: `FRONTEND_URL`)
3. Rate limiting — 1000 req/hr global, 20 req/10min on auth endpoints
4. JWT authentication (`jwtMiddleware`)

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key |
| `FRONTEND_URL` | CORS allowed origin |
| `COOKIE_DOMAIN` | Shared parent domain for auth cookies across FE/BE subdomains (e.g. `.dev.tt-manager.ttc.voelkerlabs.de`); unset locally |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth2 |
| `RESEND_API_KEY` / `RESEND_EMAIL_FROM` | Email |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_PUSH_EMAIL` | Web Push |
| `TT_API_KEY` | External table tennis API |
| `DISCORD_WEBHOOK_URL` | Discord notifications |
| `METRICS_USER` / `METRICS_PASSWORD` | Basic auth for the Prometheus `/api/metrics` endpoint (`METRICS_PASSWORD` required in production) |
| `METRICS_ALLOWED_IPS` | Comma-separated extra IPs allowed to scrape `/api/metrics` (beyond localhost/private ranges) |
| `TEST_DEFAULT_EMAIL` / `TEST_CREDENTIALS_EMAIL` | Test helpers |

## User Roles

- **Admin** — system administrators
- **TeamLeader** — coaches/team leaders
- **Player** — team members

Role is embedded in JWT payload and enforced per route.

## Database Enums

- **TeamType**: `DAMEN`, `ERWACHSENE`, `JUGEND_12/15/19`, `MADCHEN_12/15/19`
- **MatchType**: `REGULAR`, `CUP`
- **Availability**: `AVAILABLE`, `UNAVAILABLE`, `UNKNOWN`, `NOT_RESPONDED`

## API Route Prefixes

- `/api/auth/*` — login, register, OAuth2, JWT refresh, password reset
- `/api/match*` — match CRUD and availability voting
- `/api/team*` — team management
- `/api/player*` — player management
- `/api/leader*` — leader dashboard
- `/api/admin*` — admin functions
- `/api/notification*` — push notification management
- `/api/sync*` — data synchronization
- `/api/health` — health check
