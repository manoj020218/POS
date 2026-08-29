# TODO

NOW
- Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once local PostgreSQL is reachable at `localhost:5432`
- Extend Phase 11 printer domain from the shared contract foundation into receipt, kitchen-order, barcode, and QR print-job builders

NEXT
- Add transport-specific printer adapters behind `@smart-pos/printer` for `TCP`, `BLUETOOTH`, `USB`, and `SYSTEM`
- Wire API and future client packages to consume `@smart-pos/printer` instead of duplicating printer-profile types

LATER
- Shared contracts package
- Admin and POS client apps
- Sync package and offline client data layer

BLOCKED
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29
