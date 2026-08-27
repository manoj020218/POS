# TODO

NOW
- Apply stored `SALE_CREATED` and `PURCHASE_CREATED` sync events through the existing domain flows while keeping `POST /api/v1/sync/push` idempotent

NEXT
- Add sync processing status transitions and failure capture so `RECEIVED` events can move to `APPLIED` or `FAILED`

LATER
- Add cursor-based `GET /api/v1/sync/pull` foundation
- Shared contracts package
- Admin and POS client apps
- Sync package and offline client data layer

BLOCKED
- None
