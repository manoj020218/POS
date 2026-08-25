import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';
import { categories } from './category.js';
import { taxProfiles } from './tax-profile.js';
import { tenants } from './tenant.js';
import { units } from './unit.js';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id),
    taxProfileId: uuid('tax_profile_id')
      .notNull()
      .references(() => taxProfiles.id),
    sku: varchar('sku', { length: 64 }).notNull(),
    barcode: varchar('barcode', { length: 64 }),
    name: varchar('name', { length: 160 }).notNull(),
    brand: varchar('brand', { length: 120 }),
    description: varchar('description', { length: 500 }),
    hsnSac: varchar('hsn_sac', { length: 32 }),
    imageUrl: varchar('image_url', { length: 500 }),
    sellingPrice: integer('selling_price').notNull(),
    purchasePrice: integer('purchase_price'),
    openingStock: integer('opening_stock').notNull().default(0),
    lowStockLevel: integer('low_stock_level').notNull().default(0),
    trackInventory: boolean('track_inventory').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    businessBarcodeIndex: uniqueIndex('products_business_barcode_idx').on(
      table.tenantId,
      table.businessId,
      table.barcode
    ),
    businessSkuIndex: uniqueIndex('products_business_sku_idx').on(
      table.tenantId,
      table.businessId,
      table.sku
    )
  })
);
