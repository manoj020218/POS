import { index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { authUsers } from './auth-user.js';
import { businesses } from './business.js';
import { products } from './product.js';
import { tenants } from './tenant.js';

export const productPriceChanges = pgTable(
  'product_price_changes',
  {
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
    changedByUserId: uuid('changed_by_user_id').references(() => authUsers.id),
    id: uuid('id').primaryKey(),
    newPrice: integer('new_price').notNull(),
    previousPrice: integer('previous_price').notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id)
  },
  (table) => ({
    tenantBusinessProductChangedIndex: index(
      'product_price_changes_tenant_business_product_changed_idx'
    ).on(table.tenantId, table.businessId, table.productId, table.changedAt)
  })
);
