# CHANGELOG

## 2026-08-27

- Added Phase 8 sync foundation with persisted `sync_events` storage plus migration `0011_tiresome_solo.sql`
- Added protected idempotent `POST /api/v1/sync/push` with branch-scoped access checks and the new `sync:push` permission
- Stored inbound sync events exactly once per tenant/event id, returned duplicate statuses on retries, and rejected event-id reuse when the event content changed
- Added sync route coverage for retry idempotency, branch-scope denial, and conflict detection plus Drizzle repository coverage for duplicate handling and transactional rollback on conflicts
- Verified `pnpm db:generate`, `pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm db:migrate`
- Replayed supported `SALE_CREATED` and `PURCHASE_CREATED` sync events through the existing sale and purchase domain services instead of adding a separate sync-only write path
- Added sync event state updates so successfully replayed sale and purchase events move from `RECEIVED` to `APPLIED`
- Kept sync retries idempotent by reprocessing only supported duplicate events still in `RECEIVED`, while duplicate `APPLIED` events now return without creating extra sales, purchases, or inventory movements
- Added sync route coverage for sale replay inventory effects, purchase replay inventory effects, and permission-gated retry of a stored `RECEIVED` purchase event
- Verified `pnpm exec vitest run apps/api/test/sync.test.ts apps/api/test/drizzle-sync.repository.test.ts --reporter=verbose`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`

## 2026-08-26

- Added protected `POST /api/v1/sales/:saleId/returns` so tracked sale items can be returned through corrective `SALE_RETURN` inventory movements
- Validated duplicate return items, branch scope, non-tracked sale items, and cumulative return quantities against the original sale-linked ledger entries
- Added repository support for sale-detail lookup, sale-linked movement quantity aggregation, and persisted `SALE_RETURN` movement writes in both Drizzle and in-memory stores
- Added sale-return route and repository regression coverage and split the sale service into smaller files to keep manual source files under the 200-line project limit
- Verified `pnpm exec vitest run apps/api/test/sale-return.test.ts apps/api/test/drizzle-sale.repository.test.ts --reporter=verbose`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`
- Added Phase 7 supplier and purchase foundation with persisted `suppliers`, `purchases`, and `purchase_items` plus migration `0010_mushy_klaw.sql`
- Added protected `GET/POST/PATCH /api/v1/suppliers` and protected `GET/POST /api/v1/purchases` with existing RBAC and branch/business scoping rules
- Finalized purchases now create immutable purchase-item snapshots, optional supplier snapshots, and positive `PURCHASE` inventory movements that feed the existing balance endpoint
- Added supplier and purchase route coverage plus Drizzle repository integration coverage, and shared the in-memory inventory movement ledger between sale and purchase repositories for route-test consistency
- Verified `pnpm db:generate`, `pnpm exec vitest run apps/api/test/supplier.test.ts apps/api/test/purchase.test.ts apps/api/test/purchase-access.test.ts apps/api/test/drizzle-supplier.repository.test.ts apps/api/test/drizzle-purchase.repository.test.ts --reporter=verbose`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm db:migrate`, and `pnpm test`

## 2026-08-25

- Hardened protected-route bearer auth so access tokens are revalidated against the current user and current session on every authenticated request
- Added auth access-enforcement regression coverage for immediate bearer-token rejection after logout, user disable, and role-change session revocation
- Verified `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`
- Expanded auth user branch-access listing with admin-friendly assignment directory filters for `assignment`, `businessId`, and `search`
- Added business metadata plus explicit `assigned` state to branch-assignment listing responses while keeping assigned-only results as the default
- Added regression coverage for branch-directory filtering and widened the bootstrap-owner hook timeout so the full Vitest suite stays stable under current load

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
- Added `auth_users` and `auth_sessions` PostgreSQL schema plus migration `0001_lumpy_invaders.sql`
- Added `DrizzleAuthRepository` and switched runtime auth off the in-memory repository
- Moved development auth-user seeding into `pnpm bootstrap:dev` and added PostgreSQL-backed auth repository integration tests
- Added request-level RBAC guards for tenant-core write endpoints with dedicated permission integration tests
- Added an authenticated password-change endpoint that updates stored password hashes and revokes existing refresh sessions
- Added authenticated session listing and session revocation endpoints backed by persisted `auth_sessions`
- Added password reset request/confirm architecture backed by persisted hashed reset tokens and a non-leaking delivery sink
- Added request-level RBAC guards for tenant-core read endpoints with dedicated view-permission integration tests
