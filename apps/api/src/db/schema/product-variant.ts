import { boolean, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { businesses } from './business.js';
import { products } from './product.js';
import { tenants } from './tenant.js';

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  name: varchar('name', { length: 60 }).notNull(),
  sellingPrice: integer('selling_price').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
