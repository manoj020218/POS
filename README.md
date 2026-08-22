# Smart POS

Offline-first, multi-tenant POS foundation aligned with `PROJECT_PLAN.md`.

## Current scope

This repository currently contains Phase 0 foundation work:

- PNPM monorepo structure
- TypeScript + Express API app
- Zod-based environment validation
- Pino logging and centralized error handling
- Drizzle ORM + PostgreSQL wiring
- Vitest + Supertest health endpoint test
- GitHub Actions CI for install, lint, typecheck, and test

## Repository layout

```text
apps/
  api/        Express API
docs/
  decisions/  ADR location
packages/     Future shared packages
```

## Requirements

- Node.js `>=20.8.0`
- PNPM `10.33.0`
- PostgreSQL for local database work

## Environment variables

Copy `.env.example` to `.env` and set real secrets before running the API.

Required variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_SECRET`
- `LOG_LEVEL`

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate
pnpm db:migrate
```

## API

- `GET /health` returns:

```json
{
  "status": "ok"
}
```

## Notes

- Phase 1 starts only after Phase 0 verification is clean.
- `HANDOFF.md` and `TODO.md` are the continuity files for the next session.
