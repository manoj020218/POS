# TODO

NOW
- Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once local PostgreSQL is reachable at `localhost:5432`
- Begin Phase 13 functional POS UI on top of `@smart-pos/client-data` with a tablet-first checkout shell
- Keep Phase 13 touch-first so add item, quantity, remove, discount, pay, cash, UPI, print, and new sale actions do not depend on hover or keyboard shortcuts

NEXT
- Add a real client runtime and data adapter layer for the current `@smart-pos/client-data` interfaces

LATER
- Shared contracts package
- Admin and POS client apps
- Platform-backed SQLite or IndexedDB client data stores

BLOCKED
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29
