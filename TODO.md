# TODO

NOW
- Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once local PostgreSQL is reachable at `localhost:5432`

NEXT
- Printer native integrations (not a separately numbered PROJECT_PLAN.md phase — it's Android native
  plugin work under §37 Android Architecture, building on the Phase 11 printer domain at §33-34):
  waiting on an external Kotlin developer to build one combined Capacitor plugin
  (`@smart-pos/printer-bridge`, suggested name) covering Bluetooth + USB + WiFi printer connectivity
  — brief handed off in `printer/README.md`. Once delivered, wire its `write()` into
  `packages/printer`'s transport-agnostic services (`createUsbPrinterService`,
  `createBluetoothPrinterService`, and a new `createNetworkPrinterService` for WiFi). Note:
  PROJECT_PLAN.md's actual Phase 14 is UI/UX Polish (§56), not printer work — don't conflate the two
- Add `createNetworkPrinterService` to `packages/printer` (transport-agnostic WiFi/TCP wrapper,
  mirroring `createUsbPrinterService`/`createBluetoothPrinterService`) ahead of the WiFi plugin

LATER
- Shared contracts package
- Admin client app
- Wire automatic access-token refresh in `apps/pos` (currently no 401 retry/refresh loop)
- Offline/sync-status indicator in `apps/pos` (PROJECT_PLAN.md §54-55) — `syncService` is already
  exposed via `PosContext`, just needs a small UI surface (pending-event count, online/offline)

BLOCKED
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29

DONE (2026-08-31)
- Live-browser click-through of the persistent-store flow (login → terminal pick → catalog hydrates
  from sync → checkout) is now VERIFIED against `pnpm --filter @smart-pos/api dev:memory` +
  `pnpm --filter @smart-pos/pos dev`: sign-in as `asha@example.com`, pick Counter 1, catalog
  populates from the real API/sync, add an item, Cash checkout completes with a real invoice
  (`INV-MAIN-T1-000001`), New Sale resets, no console errors, `POST /api/v1/sync/push` returns `200`
- Found and fixed the bug that blocked the above: `GET /api/v1/sync/pull` returned `400` because
  `apps/pos`'s post-login bootstrap requested `limit: 200` against a server cap of `100`
- `@smart-pos/client-data`'s `createClientSyncService.pullChanges` now pages through pull results
  (loops on the returned cursor until a short page confirms the client is caught up) instead of
  assuming a single request returns the full change set — this also fixes correctness for any real
  catalog/customer/outbox backlog bigger than one page, not just the immediate 400
- Added a `sync-service.test.ts` regression test covering multi-page pulls, plus a `1000`-page safety
  cap in the pull loop against a misbehaving/looping server response
- Verified `pnpm typecheck`, `pnpm lint`, and the full `pnpm test` suite (74 files / 193 tests)

DONE (2026-08-30)
- Phase 13 kiosk-first POS checkout UI: new `apps/pos` (React + Vite + Tailwind v4) touch-first
  shell — product catalog with search/category tabs, cart with quantity/remove/discount, customer
  picker, Cash/Card/UPI/Other payment with an on-screen numeric keypad, on-screen receipt result,
  and New Sale reset
- Calculator shortcut in the kiosk top bar (expression + result display)
- Real cashier login (`POST /api/v1/auth/login`) and terminal picker (`GET /api/v1/terminals`) in
  `apps/pos`, replacing the fixed demo terminal context; session persisted in `localStorage`
- `@smart-pos/client-data`: new `createHttpAuthClient` (login/refresh/logout) and
  `listBranches`/`listTerminals` added to `ClientRemoteApi`/`createHttpClientRemoteApi`
- `@smart-pos/client-data`: new `createIndexedDbClientDataStore` — a persistent, browser-native
  `ClientDataStore` implementation (products/customers/sales/settings/stock/sync), tested against
  the real IndexedDB API via `fake-indexeddb`
- `apps/pos` now hydrates its catalog/customer data from the real API on login via
  `bootstrap-service`/`sync-service` against the IndexedDB store, instead of a local demo seed;
  checkout does a best-effort background sync push right after each sale
- `apps/api`: `GET /api/v1/business-settings` now requires `terminal:view` instead of
  `settings:manage`, so any terminal-operating role (not just owners/admins) can read the settings
  a POS terminal needs to function; write (`PATCH`) still requires `settings:manage`
- `apps/api`: added `pnpm --filter @smart-pos/api dev:memory` — an in-memory-repository dev server
  (seeds a tenant/business/branch/2 terminals/1 cashier, plus a small demo catalog) for exercising
  real auth/API/sync flows locally without PostgreSQL
