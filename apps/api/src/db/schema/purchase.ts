import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { authUsers } from './auth-user.js';
import { branches } from './branch.js';
import { businesses } from './business.js';
import { suppliers } from './supplier.js';
import { tenants } from './tenant.js';

export const purchases = pgTable('purchases', {
  branchCode: varchar('branch_code', { length: 32 }).notNull(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => authUsers.id),
  id: uuid('id').primaryKey(),
  itemCount: integer('item_count').notNull(),
  notes: varchar('notes', { length: 500 }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  referenceNumber: varchar('reference_number', { length: 96 }),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierName: varchar('supplier_name', { length: 160 }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  totalAmount: integer('total_amount').notNull(),
  totalQuantity: integer('total_quantity').notNull()
});
