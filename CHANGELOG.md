# CHANGELOG

## 2026-08-22

- Initialized local repository for Smart POS
- Added Phase 0 monorepo, API, test, and CI foundation
- Added continuity docs: `HANDOFF.md`, `TODO.md`, and `README.md`
- Verified lint, typecheck, test, build, and runtime health checks
- Added first Phase 1 multi-tenant core slice with tenant/business/branch/terminal schema
- Generated initial Drizzle migration for the Phase 1 entities
- Added tenant-scoped business, branch, and terminal API endpoints plus isolation tests
- Replaced temporary tenant-core runtime wiring with a Drizzle/PostgreSQL repository
- Added repository integration coverage using `PGlite`
- Added an explicit `pnpm bootstrap:dev` tenant/business/branch/terminal provisioning flow
- Removed temporary startup tenant seeding from the API server
- Fixed monorepo env loading so API package scripts read the workspace-root `.env`
- Verified `pnpm db:migrate`, `pnpm bootstrap:dev`, and a live PostgreSQL-backed API smoke flow
