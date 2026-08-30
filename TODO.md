# TODO

NOW
- Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once local PostgreSQL is reachable at `localhost:5432`
- Wire `apps/pos` to a real client runtime and data adapter layer (HTTP remote API + persistent
  local store) in place of the seeded in-memory `@smart-pos/client-data` store it uses today

NEXT
- Add a real client runtime and data adapter layer for the current `@smart-pos/client-data` interfaces
- Add a cashier login/terminal-selection screen for `apps/pos` once auth wiring is in scope

LATER
- Shared contracts package
- Admin client app
- Platform-backed SQLite or IndexedDB client data stores

BLOCKED
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29

DONE (2026-08-30)
- Phase 13 kiosk-first POS checkout UI: new `apps/pos` (React + Vite + Tailwind v4) touch-first
  shell on top of `@smart-pos/client-data`'s seeded in-memory store — product catalog with
  search/category tabs, cart with quantity/remove/discount, customer picker, Cash/Card/UPI/Other
  payment with on-screen numeric keypad, on-screen receipt result, and New Sale reset
