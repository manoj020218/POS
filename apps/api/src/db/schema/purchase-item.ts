import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { products } from './product.js';
import { purchases } from './purchase.js';
import { tenants } from './tenant.js';

export const purchaseItems = pgTable('purchase_items', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  id: uuid('id').primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  productName: varchar('product_name', { length: 160 }).notNull(),
  productSku: varchar('product_sku', { length: 64 }).notNull(),
  purchaseId: uuid('purchase_id')
    .notNull()
    .references(() => purchases.id),
  quantity: integer('quantity').notNull(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  totalCost: integer('total_cost').notNull(),
  unitCost: integer('unit_cost').notNull()
});
