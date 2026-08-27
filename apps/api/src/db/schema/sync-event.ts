import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { tenants } from './tenant.js';

export const syncEvents = pgTable(
  'sync_events',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    deviceId: varchar('device_id', { length: 128 }).notNull(),
    entityId: varchar('entity_id', { length: 128 }).notNull(),
    eventCreatedAt: timestamp('event_created_at', { withTimezone: true }).notNull(),
    eventId: varchar('event_id', { length: 128 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureCode: varchar('failure_code', { length: 64 }),
    failureMessage: varchar('failure_message', { length: 500 }),
    failureStatusCode: integer('failure_status_code'),
    id: uuid('id').primaryKey(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    state: varchar('state', { length: 32 }).notNull().default('RECEIVED'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id)
  },
  (table) => ({
    tenantBranchReceivedIndex: index('sync_events_tenant_branch_received_idx').on(
      table.tenantId,
      table.branchId,
      table.receivedAt
    ),
    tenantEventIndex: uniqueIndex('sync_events_tenant_event_idx').on(table.tenantId, table.eventId),
    tenantStateReceivedIndex: index('sync_events_tenant_state_received_idx').on(
      table.tenantId,
      table.state,
      table.receivedAt
    ),
    tenantStateUpdatedIndex: index('sync_events_tenant_state_updated_idx').on(
      table.tenantId,
      table.state,
      table.updatedAt
    )
  })
);
