# TODO

NOW — client wants to roll out (asked 2026-09-06); go-live checklist, roughly in order:
1. ~~Access-token refresh~~ — DONE 2026-09-06, see below
2. ~~Bulk product upload/download~~ — DONE 2026-09-07, see below
3. **Self-serve onboarding via billing-platform + marketing page** (client asked 2026-09-07 for
   customers to sign up the same way as the client's other products — community, hotelqr, etc. —
   through their shared billing/trial system, plus a real marketing/signup page):
   - ~~Part 1 — `POST /api/bridge/provision` in this repo~~ — DONE 2026-09-07, see below
   - ~~Part 3 — marketing/signup page (`apps/marketing`)~~ — DONE 2026-09-07, see below. Its signup
     form calls `https://iotsoft.in/api/smartpos/signup`
   - ~~Part 2 — billing-platform integration~~ — DONE 2026-09-07, pushed and deployed to production
     2026-09-08, in the *separate* `manoj020218/billing` repo
     (`D:\IOT Device\Billing at IOT soft\billing-server`), see below.
   - ~~Part 4 — deploy everything to the new VPS~~ — **DONE 2026-09-08**, see the dated entry below.
     Self-serve onboarding is now fully live end-to-end in production: a real signup at
     `https://iotsoft.in/api/smartpos/signup` creates a real tenant via
     `https://smartpos.iotsoft.in/api/bridge/provision`, and the returned temp password logs in
     against the live API — verified with a real (test) signup, then cleaned up.
4. ~~**VPS deployment (Part 4 above)**~~ — **DONE 2026-09-08**. Deployed the whole Smart POS stack
   (API + Postgres + marketing page) to the second, more capable VPS (connection details
   intentionally kept out of this repo — see the assistant's own reference notes, not git).
   Path-based routing on one domain: `smartpos.iotsoft.in/` serves the marketing page,
   `smartpos.iotsoft.in/api/` proxies to the API. Everything lives under `/root/projects/smartpos`,
   deployed via `pnpm`, structured so it can be copied to a future production server with minimal
   changes. PostgreSQL 16 installed **once**, shared/reusable by future projects (separate
   database + role per project — `smart_pos`/`smartpos` is just this project's slice of it).
5. ~~Re-run `pnpm db:migrate` against a real Postgres~~ — **DONE 2026-09-08**, ran automatically as
   part of the Part 4 deploy against the new VPS's Postgres.
6. Lock down CORS for the real domain (currently `cors()` with no origin restriction — fine for
   dev/localhost, not for a public domain) and add rate limiting (PROJECT_PLAN.md §60 lists this as a
   from-the-beginning security requirement; currently absent) — now that the API is actually
   internet-facing, this is more pressing than before
7. Get a real Android tablet + a real BLE or USB thermal printer to run the plugin's own
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
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29 — moot now
  that migrations run against the real production Postgres on the new VPS instead (Part 4, done
  2026-09-08)

DONE (2026-09-08)
- **Self-serve onboarding, Part 4 — VPS deployment**: deployed the whole Smart POS stack to the
  second VPS. Packaged the repo with `git archive` (only committed files — clean, no `node_modules`/
  `dist`), transferred it, then on the server: installed PostgreSQL 16 (AlmaLinux's built-in module,
  no extra repo needed) and switched local auth from the distro default (`ident`) to
  `scram-sha-256`, since app code can't authenticate against `ident`; created a dedicated
  `smartpos`/`smart_pos` role+database — deliberately just one project's slice of a Postgres install
  meant to be reused by future projects, not a one-off. Excluded `apps/pos` from the server package
  entirely — it's the Android app and has a `file:` dependency on the separate `capacitor-plugins`
  repo that has no reason to exist on a server; `pnpm install`/`build` are scoped to
  `@smart-pos/api` only, which has zero workspace-package dependencies of its own. Wrote a PM2
  ecosystem file and an nginx config mirroring the client's existing `fireguard.conf` pattern
  (path-based: `/api/` proxies to the app, `/` serves the static marketing page), then ran certbot
  for TLS — DNS was already pointed at this VPS before starting.
- **Two real bugs hit and fixed during deployment**: (1) AlmaLinux's SELinux (enforcing by default)
  labels files copied from `/root` with the wrong context, so nginx got a `403` reading the
  marketing page even though Unix permissions were fine — fixed with `restorecon -Rv` on the target
  directory, now baked into the deploy script for future re-runs; (2) PowerShell 5.1 treats *any*
  stderr output from a native command as a terminating error when `$ErrorActionPreference = "Stop"`
  is set, which killed the deploy mid-`pnpm install` on a completely benign `postgresql-setup`
  progress message — switched to `"Continue"` plus an explicit exit-code check instead.
- **Verified fully end-to-end in production, not just component-by-component**: a real signup
  against the live `https://iotsoft.in/api/smartpos/signup` created a real tenant via
  `https://smartpos.iotsoft.in/api/bridge/provision`, and the returned temp password logged in
  successfully against the live API with full `BUSINESS_OWNER` permissions. Confirmed the API port
  (4090) is not reachable from outside — `firewalld` only has 80/443/22/cockpit and a couple of
  other apps' ports open, so the only path in is through nginx's TLS-terminated proxy.
- The self-serve onboarding checklist item (NOW #3) is now **fully done** — all four parts (bridge
  endpoint, billing-platform integration, marketing page, VPS deployment) are live in production.

DONE (2026-09-07)
- Bulk product upload/download for `apps/pos`: a new "Import or export products" screen (gear-like
  icon in `TopBar` → `ProductImportExportModal`) lets an owner/manager download the full catalog as
  a CSV and import a CSV of new products — closing the gap where a 300-product kirana-store catalog
  had no way in besides one-at-a-time API calls
- Chose CSV-via-file-picker over a dedicated pen-drive API per the client's explicit ask (tablet/
  mobile device, USB pen drive for both directions): a plain `<input type="file">` opens Android's
  system file picker, which already lists a connected USB OTG drive; export triggers a browser
  download (lands in Downloads by default — moving it to a pen drive from there is a manual step,
  noted in the UI copy)
- `@smart-pos/client-data`'s `ClientRemoteApi` gained `createProduct` (`POST /products`) and
  `listProducts` (`GET /products`, paginated) — neither existed before; catalog data only ever
  flowed through sync-pull, never direct REST calls, until now
- Added `requestJsonEnvelope` to `http-fetch-helpers.ts` (mirrors `requestJson` but also returns the
  `meta` envelope field) since `GET /products` returns pagination metadata that plain `requestJson`
  discards
- Added `apps/pos/src/lib/csv.ts` (minimal RFC4180-ish parse/stringify, handles quoted fields with
  embedded commas/quotes) and `apps/pos/src/lib/product-csv.ts` (column mapping + rupee↔paise
  conversion, since the API stores money as integer paise but a shop owner types rupees)
- Import is row-by-row with per-row error collection (bad rows are skipped and reported, not fatal
  to the whole file) and a live progress readout; permission errors (a cashier account lacks
  `product:create`) now surface the real server message ("Insufficient permissions") instead of a
  generic failure, thanks to the `readErrorMessage` fix from the token-refresh work the day before
- `apps/api`'s `dev:memory` server now also seeds a `BUSINESS_OWNER` test account
  (`owner@example.com` / `Password123`, printed in the startup JSON) — the existing cashier seed
  lacks `settings:manage`/`product:create`, so this is needed to exercise printer pairing or product
  import locally at all
- Verified live end-to-end as the owner account: imported a CSV with 2 valid + 2 intentionally-bad
  rows (missing name, invalid price) — got 2 real `201`s server-side, 2 clear per-row error messages,
  no crash; exported CSV afterward included both original demo products and the newly-imported ones
  with correct rupee formatting and auto-provisioned category/unit/tax defaults. Separately verified
  the cashier account gets a graceful "Insufficient permissions" row error instead of a crash
- Added 16 new tests (`apps/pos/test/lib/csv.test.ts`, `apps/pos/test/lib/product-csv.test.ts`)
  covering CSV quoting/escaping edge cases and product-row parsing/validation
- Verified `pnpm typecheck`, `pnpm lint`, full `pnpm test` (78 files / 219 tests)

- **Self-serve onboarding, Part 1 — `POST /api/bridge/provision`**: studied the client's existing
  billing-platform (a separate production Node/MongoDB service on the old VPS used by every other
  client product — community, hotelqr, fireguard) to learn its real integration pattern
  (`{PRODUCT}_API_BASE`/`{PRODUCT}_BRIDGE_SECRET` env vars, a shared-secret-authenticated
  `POST {API_BASE}/api/bridge/provision` call) before building anything. New `apps/api/src/modules/bridge/`
  module: shared-secret auth (`require-bridge-secret.ts`, first non-JWT auth in this codebase),
  creates tenant + business + a default "Main Branch"/"Counter 1" terminal (a terminal is required —
  `apps/pos`'s picker only lists existing terminals, can't register new ones) + a `BUSINESS_OWNER`
  auth user with a freshly generated temp password (new `generate-temporary-password.ts`, no such
  utility existed before). Deliberately composes `TenantCoreRepository`'s `create*` methods directly
  rather than reusing `bootstrapDevelopmentTenant` — that helper's idempotency lookups run raw
  Drizzle queries against a real Postgres handle, so it can't run against the in-memory repository
  used in tests/`dev:memory`, and a signup is always a brand-new tenant anyway so that idempotency
  isn't needed. Verified live against `dev:memory`: correct/missing/wrong secret handling, and the
  returned temp password actually logs in with full `BUSINESS_OWNER` permissions
- **Self-serve onboarding, Part 3 — marketing/signup page**: new `apps/marketing/` (plain static
  site, no build step, matching the client's `hotelqr-marketing` convention) — hero, a 9-card
  feature grid (including kitchen-order-ticket printing for dhabas/restaurants and barcode/QR
  support), an 8-question FAQ, a signup form, and a Privacy/Terms/About tabbed section (required for
  Google OAuth consent + Play Store listing), plus `robots.txt`/`sitemap.xml`/OG tags/JSON-LD
  `SoftwareApplication` structured data for SEO. Positioned as **free** software for kirana stores,
  general retail, food stalls, dhabas, vegetable vendors, and restaurants (client's explicit
  positioning, 2026-09-07). Verified live in a real browser (feature grid, FAQ accordion, legal tab
  switching); found and fixed a real bug in the signup form's error handling — a non-JSON error
  response (e.g. before Part 2's endpoint exists) surfaced a raw "Unexpected token '<'" parse error
  to the user instead of a clean message
- Verified `pnpm typecheck`, `pnpm lint`, full `pnpm test` (79 files / 224 tests) after Part 1

- **Self-serve onboarding, Part 2 — billing-platform integration** (separate repo,
  `D:\IOT Device\Billing at IOT soft\billing-server`, `manoj020218/billing`): new
  `smartpos.routes.js`/`smartpos.controller.js`/`seedSmartpos.js`, mirroring `community.routes.js`/
  `.controller.js` exactly — public rate-limited `POST /api/smartpos/signup`, duplicate-check against
  billing's own `Client` collection, creates a 6-month-trial `Client`, calls this repo's own
  `POST /api/bridge/provision` with `X-Bridge-Secret`, stores the returned business id, responds with
  `{ ok, businessCode, email, tempPassword, message }` — deliberately **no `loginUrl`** (unlike
  community's response), since the client confirmed customers get in-app credentials for the
  already-installed Android app, not a web login link. Added `SMARTPOS_API_BASE`/
  `SMARTPOS_BRIDGE_SECRET` to that repo's `.env.example`/`.env.production.example`, mounted the route
  in `src/index.js`. Verified fully end-to-end locally (billing-server against this repo's own
  `dev:memory`, via `mongodb-memory-server`): valid signup → `201` with real tenant IDs, duplicate
  email → `409`, missing field → `400`, and the returned temp password logs in against this repo's
  real `/api/v1/auth/login` with full `BUSINESS_OWNER` permissions. Committed (`a7cae8e`) and pushed
  to that repo's remote, then **deployed to the shared production VPS (2026-09-08)**: files copied
  to the live `billing-platform` (not a git checkout there — kept in sync via direct file transfer,
  per that repo's own documented workflow), env vars added, product reseeded, `pm2 restart` — verified
  live (`/health` OK, `/api/smartpos/signup` validating real requests). A real signup will `502` at
  the bridge-provision step until Part 4 deploys Smart POS's own API — expected, not a bug

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
