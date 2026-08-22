# Smart POS

Offline-first, multi-tenant POS foundation aligned with `PROJECT_PLAN.md`.

## Current scope

This repository currently contains verified Phase 0 foundation work plus the active Phase 1
tenant/business/branch/terminal slice:

- PNPM monorepo structure
- TypeScript + Express API app
- Zod-based environment validation
- Pino logging and centralized error handling
- Drizzle ORM + PostgreSQL wiring
- Vitest + Supertest health endpoint test
- GitHub Actions CI for install, lint, typecheck, and test
- Phase 1 tenant/business/branch/terminal API slice
- PostgreSQL-backed tenant-core runtime repository

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

Copy `.env.example` to the repository root as `.env` and set real secrets before running the
API. Package-level scripts load the workspace-root env file.

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
pnpm db:migrate
pnpm bootstrap:dev
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate
```

## API

- `GET /health` returns:

```json
{
  "status": "ok"
}
```

## Phase 1 development access

Authentication is not implemented yet. The current Phase 1 routes use temporary development
headers to resolve access context:

- `x-dev-tenant-id`
- `x-dev-user-id`

To provision a local development hierarchy, set these variables in `.env` and run
`pnpm bootstrap:dev`:

- `DEV_TENANT_ID`
- `DEV_TENANT_NAME`
- `DEV_TENANT_SLUG` (optional)
- `DEV_BUSINESS_CODE` / `DEV_BUSINESS_NAME` (optional pair)
- `DEV_BRANCH_CODE` / `DEV_BRANCH_NAME` (optional pair)
- `DEV_BRANCH_ADDRESS` (optional)
- `DEV_TERMINAL_CODE` / `DEV_TERMINAL_NAME` (optional pair)
- `DEV_TERMINAL_INSTALLATION_ID` (optional)

Before using the PostgreSQL-backed API routes against a real database, run this sequence:

```bash
pnpm db:migrate
pnpm bootstrap:dev
```

## Notes

- Phase 1 starts only after Phase 0 verification is clean.
- `HANDOFF.md` and `TODO.md` are the continuity files for the next session.
