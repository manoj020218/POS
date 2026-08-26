import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { products } from './product.js';
import { sales } from './sale.js';
import { tenants } from './tenant.js';

export const saleItems = pgTable('sale_items', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  discountAmount: integer('discount_amount').notNull().default(0),
  id: uuid('id').primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  productName: varchar('product_name', { length: 160 }).notNull(),
  productSku: varchar('product_sku', { length: 64 }).notNull(),
  quantity: integer('quantity').notNull(),
  saleId: uuid('sale_id')
    .notNull()
    .references(() => sales.id),
  subtotalAmount: integer('subtotal_amount').notNull(),
  taxAmount: integer('tax_amount').notNull().default(0),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  totalAmount: integer('total_amount').notNull(),
  unitPrice: integer('unit_price').notNull()
});
