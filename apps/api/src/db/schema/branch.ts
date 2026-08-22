import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';
import { tenants } from './tenant.js';

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    name: varchar('name', { length: 120 }).notNull(),
    code: varchar('code', { length: 32 }).notNull(),
    address: varchar('address', { length: 240 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tenantCodeIndex: uniqueIndex('branches_tenant_code_idx').on(table.tenantId, table.code)
  })
);
