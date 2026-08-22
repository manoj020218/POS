# HANDOFF

Current Phase:
- Phase 2 - Authentication and RBAC

Current Subtask:
- Password change and reset architecture is the next safe Phase 2 slice

Completed:
- Read `PROJECT_PLAN.md`
- Confirmed GitHub repo `manoj020218/POS` exists and is empty
- Initialized local Git repo and attached `origin`
- Determined `HotelQR-Lite` is not a direct codebase reuse candidate
- Added PNPM workspace, TypeScript, ESLint, Prettier, Vitest, Drizzle, and CI
- Implemented `apps/api` with env validation, logging, error handling, DB wiring, and `GET /health`
- Verified `pnpm lint`
- Verified `pnpm typecheck`
- Verified `pnpm test`
- Verified `pnpm build`
- Verified runtime health response at `http://127.0.0.1:4010/health`
- Added Drizzle schema for `Tenant`, `Business`, `Branch`, and `Terminal`
- Generated first migration: `apps/api/drizzle/0000_damp_loners.sql`
- Added Phase 1 API routes for business create/update/list, branch create/update/list, and terminal register/disable/list
- Added temporary development access-context resolution via `x-dev-tenant-id` and `x-dev-user-id`
- Added tenant-isolation and CRUD tests for the Phase 1 route slice
- Verified runtime business create/list flow at `http://127.0.0.1:4011/api/v1/businesses`
- Replaced runtime tenant-core wiring with `DrizzleTenantCoreRepository`
- Switched the runtime database client to `pg` + Drizzle node-postgres
- Added repository-level integration tests backed by in-memory `PGlite`
- Removed temporary startup tenant seeding from the API server
- Added `pnpm bootstrap:dev` with idempotent tenant/business/branch/terminal provisioning logic
- Fixed API monorepo env loading so package scripts resolve the workspace-root `.env`
- Verified `pnpm db:migrate` against local PostgreSQL 18
- Verified `pnpm bootstrap:dev` against the real `smart_pos` database
- Verified live PostgreSQL-backed runtime smoke for `GET /health`, `POST /api/v1/businesses`, and `GET /api/v1/businesses`
- Added a typed role and permission catalog for Phase 2 authorization
- Added reusable permission guard middleware that resolves role-derived and explicit permissions
- Added authorization tests for role grants plus `401`/`403` permission enforcement
- Added `/api/v1/auth/login`, `/api/v1/auth/refresh`, and `/api/v1/auth/logout` route scaffolding
- Added password hashing and signed token helpers using Node crypto primitives
- Added in-memory auth repository support for users, sessions, refresh rotation, and logout revocation
- Added auth route tests for invalid credentials, disabled users, refresh rotation, and logout revocation
- Replaced the temporary development access headers with bearer access-token resolution for protected routes
- Added auth access-context failure tests for invalid authorization headers, refresh tokens on protected routes, and expired access tokens
- Added optional env-backed development auth user seeding for runtime login smoke verification
- Verified live PostgreSQL-backed runtime smoke for `POST /api/v1/auth/login`, `POST /api/v1/businesses`, and `GET /api/v1/businesses` using a bearer token
- Added `auth_users` and `auth_sessions` database schema plus generated migration `apps/api/drizzle/0001_lumpy_invaders.sql`
- Added PostgreSQL-backed `DrizzleAuthRepository` for auth users and sessions
- Moved development auth-user seeding into the explicit `pnpm bootstrap:dev` flow
- Switched runtime auth from the in-memory repository to PostgreSQL-backed persistence
- Added auth repository integration tests backed by `PGlite`
- Verified live PostgreSQL-backed runtime smoke for `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/businesses`, and `GET /api/v1/businesses`
- Added request-level permission guards for tenant-core business, branch, and terminal write endpoints
- Added tenant-core permission integration tests covering `403` denial for unauthorized business, branch, and terminal writes

Currently Working:
- No active code changes in progress
- Next safe unit is password change and reset architecture

Next:
- Add password change and reset architecture
- Add session/device listing and revocation endpoints
- Add real auth-user creation and management flows beyond bootstrap-only development seeding
- Add request-level permission guards on protected reads

Important Decisions:
- Start with a modular monolith foundation under `apps/api`
- Use TypeScript, Express, Zod, Pino, Drizzle, PostgreSQL, and Vitest
- Treat `HotelQR-Lite` only as an operational reference, not as source reuse
- Keep tenant scoping in request access context rather than accepting tenant IDs in request bodies
- Use a temporary development-only access-context bootstrap until Phase 2 authentication exists
- Use `PGlite` for fast self-contained repository integration tests while keeping `pg` for the real runtime client
- Use an explicit bootstrap command instead of auto-seeding tenants during API startup
- Resolve env files from the workspace root so root-level `.env` works for filtered PNPM package scripts
- Keep RBAC authorization permission-driven, with role-to-grant mapping in one typed catalog
- Keep the first auth slice repository-backed but in-memory so the HTTP/service/token boundaries are verified before adding database persistence
- Resolve protected-route access context from signed bearer access tokens rather than development headers
- Allow an optional env-backed development auth user only as a temporary bridge until auth persistence exists
- Keep development auth seeding explicit in `pnpm bootstrap:dev` rather than auto-creating auth users during API startup
- Back runtime auth with the same PostgreSQL repository boundary used by the persistence tests
- Enforce tenant-core write authorization at the router layer so controllers remain thin and permission checks stay request-scoped

Known Issues:
- Local `pnpm install` required temporary `npm_config_strict_ssl=false` on this machine due npm registry certificate validation failures
- Local PostgreSQL-backed verification still depends on the developer maintaining an ignored root `.env`
- Real auth-user management endpoints do not exist yet; runtime login currently depends on users being seeded explicitly through bootstrap or future admin flows

Tests:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Runtime probe: `GET /health -> {"status":"ok"}`
- Repository integration: tenant/business/branch/terminal persistence validated with `PGlite`
- Bootstrap integration: idempotent tenant/business/branch/terminal provisioning validated with `PGlite`
- Real DB verification: `pnpm db:migrate`
- Real DB verification: `pnpm bootstrap:dev`
- Runtime smoke: `GET /health`, `POST /api/v1/businesses`, `GET /api/v1/businesses` against PostgreSQL 18
- Authorization tests: role grant resolution plus permission guard `401`/`403` behavior
- Auth route tests: login success, invalid credentials, disabled user rejection, refresh rotation, logout revocation
- Protected-route auth tests: login to obtain bearer token, then create/list/update tenant-core resources through authenticated access
- Auth access-context tests: invalid authorization header, refresh token rejected on protected routes, expired access token rejected
- Runtime smoke: `GET /health`, `POST /api/v1/auth/login`, `POST /api/v1/businesses`, `GET /api/v1/businesses`
- Auth repository integration: persisted user upsert/find plus session create/update/revoke lifecycle via `DrizzleAuthRepository`
- Runtime smoke: `GET /health`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/businesses`, `GET /api/v1/businesses`
- Tenant-core RBAC integration: unauthorized business/branch/terminal writes return `403`

Last Successful Commands:
- `git init -b main`
- `git remote add origin https://github.com/manoj020218/POS.git`
- `$env:npm_config_strict_ssl='false'; cmd /c pnpm install`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(phase0): scaffold monorepo api foundation"`
- `git push -u origin main`
- `cmd /c pnpm db:generate`
- `git commit -m "feat(tenant-core): add first multi-tenant core slice"`
- `$env:npm_config_strict_ssl='false'; cmd /c pnpm install`
- `git commit -m "feat(db): wire tenant core to postgres repository"`
- `where.exe psql`
- `git commit -m "feat(dev): add tenant bootstrap flow"`
- `cmd /c sc start postgresql-x64-18`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm bootstrap:dev`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- PowerShell smoke: start `pnpm dev`, verify `/health`, create/list a business
- `git commit -m "fix(env): load workspace root env for runtime scripts"`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add role permission foundation"`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): add login refresh and logout scaffolding"`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- PowerShell smoke: start `pnpm dev`, login at `/api/v1/auth/login`, then create/list businesses with `Authorization: Bearer <token>`
- `git commit -m "feat(auth): resolve bearer access context for protected routes"`
- `cmd /c pnpm db:generate`
- `cmd /c pnpm db:migrate`
- `cmd /c pnpm bootstrap:dev`
- `cmd /c pnpm test`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm lint`
- `cmd /c pnpm build`
- PowerShell smoke: start `pnpm dev`, login at `/api/v1/auth/login`, refresh at `/api/v1/auth/refresh`, then create/list businesses with `Authorization: Bearer <token>`
- `git commit -m "feat(auth): persist auth users and sessions"`
- `cmd /c pnpm lint`
- `cmd /c pnpm typecheck`
- `cmd /c pnpm test`
- `cmd /c pnpm build`
- `git commit -m "feat(auth): guard tenant core write permissions"`
- `git push`

Database Status:
- Drizzle schema created for tenant/business/branch/terminal
- Migration generated at `apps/api/drizzle/0000_damp_loners.sql`
- PostgreSQL persistence layer implemented in code
- Migration applied successfully to local PostgreSQL 18 database `smart_pos`
- Development tenant/business/branch/terminal bootstrap verified against the real database
- Auth user/session schema added at `apps/api/drizzle/0001_lumpy_invaders.sql`
- `auth_users` and `auth_sessions` are now persisted in PostgreSQL
- Development auth user bootstrap verified against the real database

API Status:
- Phase 0 scaffold verified
- Phase 1 route slice verified with business, branch, and terminal endpoints
- `GET /health` returns `{"status":"ok"}`
- Live PostgreSQL-backed business create/list smoke verified on port `4012`
- Auth/RBAC foundation now includes typed role permissions and a reusable permission guard
- Auth route scaffolding is available for `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, and `POST /api/v1/auth/logout`
- Protected tenant-core routes now resolve request access from bearer access tokens instead of development headers
- Runtime auth users and sessions are now backed by PostgreSQL through `DrizzleAuthRepository`
- Development auth-user seeding now occurs through `pnpm bootstrap:dev`, not API startup
- Tenant-core write routes now enforce `business:*`, `branch:*`, and `terminal:*` permissions at the HTTP layer

Git Status:
- clean

Last Commit:
- `b2a8510 feat(auth): guard tenant core write permissions`
