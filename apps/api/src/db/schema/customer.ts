import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { businesses } from './business.js';
import { tenants } from './tenant.js';

export const customers = pgTable('customers', {
  address: varchar('address', { length: 500 }),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  email: varchar('email', { length: 160 }),
  id: uuid('id').primaryKey(),
  isActive: boolean('is_active').notNull().default(true),
  isWalkIn: boolean('is_walk_in').notNull().default(false),
  mobile: varchar('mobile', { length: 32 }),
  name: varchar('name', { length: 160 }).notNull(),
  notes: varchar('notes', { length: 500 }),
  taxNumber: varchar('tax_number', { length: 64 }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
