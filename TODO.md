# TODO

NOW
- Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once local PostgreSQL is reachable at `localhost:5432`
- Swap `apps/pos`'s seeded in-memory catalog/customer store for a persistent one (IndexedDB) synced
  from the real API via `@smart-pos/client-data`'s `bootstrap-service`/`sync-service` — auth and
  terminal selection are now real, but products/customers/checkout still write to a demo in-memory
  store reseeded under the real business/branch ids

NEXT
- Printer native integrations (Phase 14, PROJECT_PLAN.md §33-34/§37): Bluetooth/USB/WiFi Capacitor
  plugins per the `pos-printer-bluetooth`/`pos-printer-usb`/`pos-printer-wifi` contract, built by
  another developer; wire each plugin's `write()` into `packages/printer`'s transport-agnostic
  services once delivered
- Add `createNetworkPrinterService` to `packages/printer` (transport-agnostic WiFi/TCP wrapper,
  mirroring `createUsbPrinterService`/`createBluetoothPrinterService`) ahead of the WiFi plugin

LATER
- Shared contracts package
- Admin client app
- Wire automatic access-token refresh in `apps/pos` (currently no 401 retry/refresh loop)

BLOCKED
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29

DONE (2026-08-30)
- Phase 13 kiosk-first POS checkout UI: new `apps/pos` (React + Vite + Tailwind v4) touch-first
  shell on top of `@smart-pos/client-data`'s seeded in-memory store — product catalog with
  search/category tabs, cart with quantity/remove/discount, customer picker, Cash/Card/UPI/Other
  payment with on-screen numeric keypad, on-screen receipt result, and New Sale reset
- Calculator shortcut in the kiosk top bar (expression + result display)
- Real cashier login (`POST /api/v1/auth/login`) and terminal picker (`GET /api/v1/terminals`) in
  `apps/pos`, replacing the fixed demo terminal context; session persisted in `localStorage`
- `@smart-pos/client-data`: new `createHttpAuthClient` (login/refresh/logout) and
  `listBranches`/`listTerminals` added to `ClientRemoteApi`/`createHttpClientRemoteApi`
- `apps/api`: `GET /api/v1/business-settings` now requires `terminal:view` instead of
  `settings:manage`, so any terminal-operating role (not just owners/admins) can read the settings
  a POS terminal needs to function; write (`PATCH`) still requires `settings:manage`
- `apps/api`: added `pnpm --filter @smart-pos/api dev:memory` — an in-memory-repository dev server
  (seeds a tenant/business/branch/2 terminals/1 cashier) for exercising real auth/API flows locally
  without PostgreSQL
