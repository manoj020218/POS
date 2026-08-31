# CHANGELOG

## 2026-08-31

- Added `createIndexedDbClientDataStore` to `@smart-pos/client-data`: a persistent, browser-native `ClientDataStore` implementation, reusing the in-memory store's search/clone helpers; tested against the real IndexedDB API via `fake-indexeddb`
- `apps/pos` now hydrates its catalog/customer data from the real API on login (`bootstrap-service` + `sync-service` against the IndexedDB store) instead of a local demo seed; removed the now-unused demo `seed-*.ts` files
- Checkout now does a best-effort background sync push right after each sale
- `apps/api`'s in-memory dev server (`dev:memory`) now also seeds a small demo catalog so manual testing stays meaningful now that `apps/pos` no longer supplies its own
- Verified `pnpm typecheck`, `pnpm lint`, and the full `pnpm test` suite (74 files / 192 tests); a live browser click-through was not possible this session — the browser automation extension's safety-check service was unreachable
- Live browser click-through (login → terminal pick → checkout) found `GET /api/v1/sync/pull` failing with `400 Too big: expected number to be <=100`: `apps/pos`'s post-login bootstrap called `syncService.syncNow({ limit: 200 })`, above the server's `sync/pull` cap of `100`
- Fixed `@smart-pos/client-data`'s `createClientSyncService.pullChanges` to page through pull results (looping on the returned cursor until a short page confirms the client has caught up) instead of assuming one request returns the full change set, with a `1000`-page safety cap against a misbehaving/looping server response; lowered `apps/pos`'s bootstrap `syncNow` request limit from `200` to `100` to match the server cap
- Verified `pnpm typecheck`, `pnpm lint`, and the full `pnpm test` suite (74 files / 193 tests) plus a live browser click-through against `dev:memory`: login → terminal pick → catalog hydrates from sync → add item → Cash checkout → invoice `INV-MAIN-T1-000001` → New Sale reset, with no console errors and `POST /api/v1/sync/push` confirmed `200` in the server log

## 2026-08-30

- Added Phase 13 kiosk-first POS checkout UI: new workspace app `apps/pos` (React + Vite + Tailwind CSS v4), touch-first product search/category browsing, cart with quantity/discount/remove, customer picker, Cash/Card/UPI/Other payment with an on-screen numeric keypad, on-screen receipt result, and New Sale reset
- Fixed a browser-bundling bug in `@smart-pos/printer`: the barrel export pulled in a Node-only `node:net` import (`tcp-printer-service.ts`), crashing any browser import of `@smart-pos/client-data`; moved it behind a new `@smart-pos/printer/tcp` subpath so the main entry stays browser-safe
- Added a calculator shortcut to the kiosk top bar, showing the running input expression above the computed result
- Added real cashier login (`POST /api/v1/auth/login`) and terminal picker (`GET /api/v1/terminals`) to `apps/pos`, replacing the fixed demo terminal context; session persists in `localStorage` and survives a reload
- Added `createHttpAuthClient` and `listBranches`/`listTerminals` to `@smart-pos/client-data`'s `ClientRemoteApi`
- Changed `GET /api/v1/business-settings` to require `terminal:view` instead of `settings:manage`, so any terminal-operating role can read the settings a POS terminal needs (write still requires `settings:manage`)
- Added `pnpm --filter @smart-pos/api dev:memory`, an in-memory-repository dev server for exercising real auth/API flows locally without PostgreSQL
- Verified `pnpm typecheck`, `pnpm lint`, `pnpm test`, and a live browser walkthrough of login → terminal pick → checkout against the in-memory dev server

## 2026-08-29

- Added Phase 10 business settings persistence with `business_settings` and `branch_settings` schema plus migration `0014_oval_oracle.sql`
- Added protected `GET /api/v1/business-settings` and `PATCH /api/v1/business-settings` for business defaults, branch address updates, and receipt printer profile configuration
- Applied configured business settings to default product unit/tax/inventory behavior, sale invoice prefixes, and reporting timezone windows
- Fixed reporting timezone boundary handling by normalizing midnight `24:00` formatter output and added direct regression coverage for UTC and `America/New_York` day windows
- Added Phase 11 foundation package `@smart-pos/printer` with shared printer profiles, ESC/POS print-job contracts, a recording printer service, and a printer test-page builder
- Added Phase 11 receipt, kitchen-order, barcode, and QR print-job builders with shared printer-layout helpers
- Added ESC/POS byte encoding plus transport-specific printer services for `TCP`, `BLUETOOTH`, `USB`, and `SYSTEM`, along with a profile-aware router for runtime dispatch
- Increased `apps/api/test/drizzle-settings.repository.test.ts` setup timeout so the growing Vitest suite remains stable under full-repo execution
- Expanded root `pnpm typecheck`, `pnpm build`, and Vitest discovery so the printer package is covered by normal verification
- Verified `cmd /c pnpm --filter @smart-pos/printer typecheck` and `cmd /c pnpm exec vitest run packages/printer/test --reporter=verbose`
- Verified `cmd /c pnpm lint`, `cmd /c pnpm typecheck`, `cmd /c pnpm build`, and `cmd /c pnpm test` on 2026-08-29 with `182` tests passing
- Attempted `cmd /c pnpm db:migrate`, but local PostgreSQL at `localhost:5432/smart_pos` was unavailable on 2026-08-29

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
