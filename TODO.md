# TODO

NOW
- Verify the runtime against a real PostgreSQL instance after migrations
- Create a local `.env` with a valid `DATABASE_URL`
- Run `pnpm db:migrate` and `pnpm bootstrap:dev` against the real database

NEXT
- Authentication and RBAC foundation
- Role and permission mapping
- Auth failure tests

LATER
- Shared contracts package
- Admin and POS client apps
- Sync package and offline client data layer

BLOCKED
- Real PostgreSQL runtime verification depends on a running PostgreSQL instance and local `.env`
