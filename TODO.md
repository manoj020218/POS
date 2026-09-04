# TODO

NOW
- Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once local PostgreSQL is reachable at `localhost:5432`
- Get a real Android tablet + a real BLE or USB thermal printer to run the plugin's own
  `HARDWARE_TEST_CHECKLIST.md` and confirm actual printing works — `apps/pos/android/app/build/outputs/apk/debug/app-debug.apk`
  builds successfully (2026-09-04) but has NOT been run on physical hardware; nothing in this
  environment can verify that

NEXT — toward "full production launch" (client's request, 2026-09-04; see PROJECT_PLAN.md §66 MVP
boundary for the full list). Roughly sequenced; each phase should finish/test/commit before the next
starts per §67:
- **Phase B — Admin/reports app** (`apps/admin`, named in PROJECT_PLAN.md §5): new Vite/React app
  exposing the already-built Phase 9 reporting APIs (sales summary, tax, stock movement, etc.) plus a
  desktop-friendly business-settings screen. This is the "Basic reports" MVP item (§66)
- **Phase C — Windows/PWA support** (§66 MVP item, distinct from the Android app): PWA manifest +
  service worker for `apps/pos`, tested at the plan's stated 1366×768 breakpoint
- **Phase D — Phase 14 UI/UX Polish** (§56): spacing/typography/touch-targets/empty-loading-error
  states/accessibility across the plan's stated device order (10" tablet → 7–8" tablet → phone →
  Windows 1366×768 → larger desktop)
- **Phase E — Production hardening**: deployment foundation (§74, VPS + reverse proxy + HTTPS),
  automated + restore-tested PostgreSQL backups (§75), terminal registration hardening (§77 —
  app-controlled device identity, not Android hardware ID), explicitly checking off the §62
  regression-test list, closing the WiFi/Bluetooth-Classic printer gap below, and the LATER items
  further down

Printer follow-up (not blocking Phase A, tracked for whenever revisited):
- `@jenix/cap-thermal-printer` (delivered 2026-09-04, wired into checkout the same day) is BLE + USB
  only — WiFi/TCP and Bluetooth Classic are explicitly listed as not implemented in its own docs.
  Confirm with the developer whether those are still coming
- If/when a WiFi transport exists, add `createNetworkPrinterService` to `packages/printer`
  (transport-agnostic WiFi/TCP wrapper, mirroring `createUsbPrinterService`/`createBluetoothPrinterService`)
  and wire it the same way `createPosPrinterService` (`apps/pos/src/lib/printer/`) wires BLE/USB today

LATER
- Shared contracts package
- Wire automatic access-token refresh in `apps/pos` (currently no 401 retry/refresh loop)
- Offline/sync-status indicator in `apps/pos` (PROJECT_PLAN.md §54-55) — `syncService` is already
  exposed via `PosContext`, just needs a small UI surface (pending-event count, online/offline)

BLOCKED
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29

DONE (2026-09-04)
- Wired real BLE/USB printer hardware into checkout end-to-end: `apps/pos` now builds a real
  `PrinterService` from `@jenix/cap-thermal-printer` and passes it to `createLocalCheckoutService` —
  previously the checkout→print pipeline was fully built but never actually given a printer, so every
  print silently no-op'd
- Added a printer-pairing screen (`PrinterSettingsModal`, gear icon in `TopBar`): scan BLE/USB
  devices, pick one + paper width, persist as `receiptPrinterProfile` via the new
  `ClientRemoteApi.updateBusinessSettings` (the `PATCH` route already existed server-side, nothing
  ever called it)
- Packaged `apps/pos` as an installed Android app for the first time: Capacitor added, `android/`
  platform project generated and committed, `@jenix/cap-thermal-printer` installed as a local `file:`
  dependency and auto-detected by Capacitor. `gradlew assembleDebug` succeeds — real `app-debug.apk`
  produced (~4.2MB). NOT VERIFIED: running on a physical tablet or printing on real hardware
- Verified `pnpm typecheck`, `pnpm lint`, full `pnpm test` (76 files / 200 tests) and a live browser
  walkthrough confirming no regressions and graceful "Android only plugin" degradation in a desktop
  browser

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
