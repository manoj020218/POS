import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from './tenant.js';

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 120 }).notNull(),
    code: varchar('code', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tenantCodeIndex: uniqueIndex('businesses_tenant_code_idx').on(table.tenantId, table.code)
  })
);
