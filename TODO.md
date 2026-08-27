# TODO

NOW
- Add cursor-based `GET /api/v1/sync/pull` foundation for incremental downstream change delivery

NEXT
- Define the first outbound change-feed cursor contract so `sync/pull` can return `changes`, `nextCursor`, and `serverTime` without full-table reloads

LATER
- Shared contracts package
- Admin and POS client apps
- Sync package and offline client data layer

BLOCKED
- None
