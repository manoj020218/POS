# ADR-001: Master-Data Sync Pull Uses Snapshot Ordering

## Status

Accepted on 2026-08-28

## Context

Phase 8 already exposes a mixed `GET /api/v1/sync/pull` feed with an opaque
`(updatedAt, changeKey)` cursor. Catalog master data and products now use that
cursor to publish server-authored upsert snapshots.

The next master-data candidate is customers. At this point the backend supports
server-authored upserts for:

- categories
- units
- tax profiles
- products

The open question was whether customer pull should continue on the same
timestamp-ordered snapshot model or force a new explicit version column /
downstream change-log table first.

## Decision

Continue Phase 8 server-authored master-data pull on the existing snapshot
model:

- order records by `(updatedAt, changeKey)`
- emit typed `*_UPSERTED` changes
- scope reads by authenticated tenant and reachable businesses
- reuse existing entity `updatedAt` timestamps where they already exist

Do not add a dedicated downstream master-data change-log table yet.
Do not add explicit version columns yet.

## Rationale

- The current pull feed only needs ordered upsert snapshots, not historical
  field-by-field diffs.
- Existing master-data tables already persist `updatedAt`, so the backend can
  publish incremental changes without a migration.
- The mixed-feed cursor already handles deterministic pagination across entity
  types.
- This keeps Phase 8 moving without speculative infrastructure.

## Consequences

- Customer pull can be added immediately as `CUSTOMER_UPSERTED`.
- Master-data sync remains server-authoritative and snapshot-based for now.
- If future requirements add hard deletes, large downstream churn, or stronger
  conflict/version guarantees, introduce tombstones and a dedicated downstream
  change log in a later ADR instead of retrofitting them ad hoc.
