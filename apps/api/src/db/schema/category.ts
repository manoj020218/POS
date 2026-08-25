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

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    code: varchar('code', { length: 32 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    businessCodeIndex: uniqueIndex('categories_business_code_idx').on(
      table.tenantId,
      table.businessId,
      table.code
    )
  })
);
