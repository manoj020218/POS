import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { tenants } from './tenant.js';

export const terminals = pgTable(
  'terminals',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    name: varchar('name', { length: 120 }).notNull(),
    code: varchar('code', { length: 32 }).notNull(),
    deviceInstallationId: varchar('device_installation_id', { length: 120 }),
    isActive: boolean('is_active').notNull().default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tenantCodeIndex: uniqueIndex('terminals_tenant_code_idx').on(table.tenantId, table.code)
  })
);
