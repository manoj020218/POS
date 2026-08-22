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
- Added the first Phase 2 RBAC foundation with a typed role/permission catalog
- Added reusable permission-guard middleware plus authorization tests
- Added Phase 2 auth route scaffolding for login, refresh, and logout
- Added password hashing, signed token utilities, and in-memory session/device tracking primitives
- Added auth route tests for login success, refresh rotation, logout revocation, invalid credentials, and disabled users
- Replaced the temporary protected-route access bootstrap with bearer access-token context resolution
- Added auth access-context failure tests for invalid authorization headers, refresh tokens on protected routes, and expired access tokens
- Added optional env-backed development auth user seeding so runtime login can be verified before auth persistence exists
