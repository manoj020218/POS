# TODO

NOW — client wants to roll out (asked 2026-09-06); go-live checklist, roughly in order:
1. ~~Access-token refresh~~ — DONE 2026-09-06, see below
2. **Bulk product upload/download** (client has ~300 products for a kirana store; there is currently
   no bulk-import endpoint and no product-entry UI anywhere — only one-at-a-time
   `POST /api/v1/products`) — in progress next
3. **VPS deployment** — client has provided a subdomain (`smartpos.iotsoft.in`) and access to a
   shared dev VPS (other services already running on it; connection details intentionally kept out
   of this repo — see the assistant's own reference notes, not git). Requirements given directly by
   the client: work under `/root/projects/smartpos` on the VPS; check existing listening ports before
   picking one, no conflicts with other services on that box; use `pnpm` on the VPS (matches its
   existing tooling, saves disk via the shared store); structure the deployment so the folder can be
   copied as-is to a real production server later with minimal changes, and so the domain can be
   swapped later if the client changes it. **Blocked on SSH credentials** (user/password or key) —
   not yet provided
4. Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once against a real
   Postgres (local `localhost:5432` has been unreachable since 2026-08-29 — the VPS/production
   Postgres is a separate instance and hasn't been touched yet)
5. Lock down CORS for the real domain (currently `cors()` with no origin restriction — fine for
   dev/localhost, not for a public domain) and add rate limiting (PROJECT_PLAN.md §60 lists this as a
   from-the-beginning security requirement; currently absent)
6. Get a real Android tablet + a real BLE or USB thermal printer to run the plugin's own
   `HARDWARE_TEST_CHECKLIST.md` and confirm actual printing works —
   `apps/pos/android/app/build/outputs/apk/debug/app-debug.apk` builds successfully (2026-09-04) but
   has NOT been run on physical hardware; nothing in this environment can verify that

NEXT — toward "full production launch" beyond the go-live checklist above (client's request,
2026-09-04; see PROJECT_PLAN.md §66 MVP boundary for the full list). Roughly sequenced; each phase
should finish/test/commit before the next starts per §67:
- **Phase B — Admin/reports app** (`apps/admin`, named in PROJECT_PLAN.md §5): new Vite/React app
  exposing the already-built Phase 9 reporting APIs (sales summary, tax, stock movement, etc.) plus a
  desktop-friendly business-settings screen. This is the "Basic reports" MVP item (§66)
- **Phase C — Windows/PWA support** (§66 MVP item, distinct from the Android app): PWA manifest +
  service worker for `apps/pos`, tested at the plan's stated 1366×768 breakpoint
- **Phase D — Phase 14 UI/UX Polish** (§56): spacing/typography/touch-targets/empty-loading-error
  states/accessibility across the plan's stated device order (10" tablet → 7–8" tablet → phone →
  Windows 1366×768 → larger desktop)
- **Phase E — Further production hardening**: automated + restore-tested PostgreSQL backups (§75),
  terminal registration hardening (§77 — app-controlled device identity, not Android hardware ID),
  explicitly checking off the §62 regression-test list, closing the WiFi/Bluetooth-Classic printer
  gap below, and the LATER items further down

Printer follow-up (not blocking Phase A, tracked for whenever revisited):
- `@jenix/cap-thermal-printer` (delivered 2026-09-04, wired into checkout the same day) is BLE + USB
  only — WiFi/TCP and Bluetooth Classic are explicitly listed as not implemented in its own docs.
  Confirm with the developer whether those are still coming
- If/when a WiFi transport exists, add `createNetworkPrinterService` to `packages/printer`
  (transport-agnostic WiFi/TCP wrapper, mirroring `createUsbPrinterService`/`createBluetoothPrinterService`)
  and wire it the same way `createPosPrinterService` (`apps/pos/src/lib/printer/`) wires BLE/USB today

LATER
- Shared contracts package
- Offline/sync-status indicator in `apps/pos` (PROJECT_PLAN.md §54-55) — `syncService` is already
  exposed via `PosContext`, just needs a small UI surface (pending-event count, online/offline)

BLOCKED
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29
- VPS deployment needs SSH credentials for the client-provided VPS (see NOW #3; connection details
  intentionally kept out of this repo)

DONE (2026-09-06)
- Wired automatic access-token refresh into `apps/pos`: access tokens expire every 15 minutes
  (`defaultAccessTokenTtlSeconds` in `apps/api`'s auth service) and nothing ever refreshed them —
  cashiers would have been logged out roughly every 15 minutes all day. `createHttpClientRemoteApi`
  now takes an `onUnauthorized` callback; on any `401` it calls it once, retries the original request
  with the refreshed token, and only gives up (surfacing the original error, which naturally routes
  back to the login screen) if the refresh itself fails
- `apps/pos/src/state/use-auth.ts` now exposes `getAccessToken`/`refreshAccessToken`, with concurrent
  refresh calls deduped into one shared in-flight promise (the server rotates the refresh token on
  use, so firing more than one refresh at once would fail the second)
- `prepare-terminal-bundle.ts`'s bootstrap effect now keys off the user id, not the whole session
  object, so a token refresh (which produces a new session object) doesn't re-run the full
  bootstrap/sync sequence
- Fixed a latent bug found while touching this code: `readErrorMessage` in `http-fetch-helpers.ts`
  read `body.error.message`, but the API's actual error shape is flat (`{ code, message }`) — every
  server error message was silently discarded in favor of the generic "Request failed with status
  NNN" fallback. Also added `HttpRequestError` (carries the HTTP status) so client code can react to
  specific statuses instead of parsing message strings
- Verified live end-to-end with a temporarily-shortened access-token TTL (reverted after, not
  committed): observed the real sequence `POST /sync/push → 401` → `POST /auth/refresh → 200` →
  retried `POST /sync/push → 200`, checkout completing normally with a real invoice, zero console
  errors
- Added regression tests in `http-client-remote-api.test.ts`: successful retry-after-401, rethrow
  when refresh fails, and no refresh attempt on non-401 failures
- Verified `pnpm typecheck`, `pnpm lint`, full `pnpm test` (76 files / 203 tests)

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
