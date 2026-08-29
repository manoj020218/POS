# TODO

NOW
- Re-run `cmd /c pnpm db:migrate` for `apps/api/drizzle/0014_oval_oracle.sql` once local PostgreSQL is reachable at `localhost:5432`
- Wire API settings and the first runtime consumer to use `@smart-pos/printer` instead of duplicating printer-profile and transport-selection logic

NEXT
- Start Phase 12 client data architecture foundations once the first runtime printer consumer path is in place

LATER
- Shared contracts package
- Admin and POS client apps
- Sync package and offline client data layer

BLOCKED
- Local PostgreSQL listener was unavailable for `cmd /c pnpm db:migrate` on 2026-08-29
