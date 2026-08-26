import { index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { businesses } from './business.js';
import { products } from './product.js';
import { tenants } from './tenant.js';

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    id: uuid('id').primaryKey(),
    movementType: varchar('movement_type', { length: 32 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityDelta: integer('quantity_delta').notNull(),
    referenceId: uuid('reference_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id)
  },
  (table) => ({
    tenantBusinessProductOccurredIndex: index('inventory_movements_tenant_business_product_occurred_idx').on(
      table.tenantId,
      table.businessId,
      table.productId,
      table.occurredAt
    ),
    tenantReferenceIndex: index('inventory_movements_tenant_reference_idx').on(
      table.tenantId,
      table.referenceId
    )
  })
);
