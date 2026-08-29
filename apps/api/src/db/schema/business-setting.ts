import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';
import { taxProfiles } from './tax-profile.js';
import { tenants } from './tenant.js';
import { units } from './unit.js';

export const businessSettings = pgTable(
  'business_settings',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('INR'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Kolkata'),
    invoicePrefix: varchar('invoice_prefix', { length: 16 }).notNull().default('INV'),
    defaultUnitId: uuid('default_unit_id').references(() => units.id),
    defaultTaxProfileId: uuid('default_tax_profile_id').references(() => taxProfiles.id),
    defaultTrackInventory: boolean('default_track_inventory').notNull().default(true),
    receiptFooter: varchar('receipt_footer', { length: 500 }),
    businessLogoUrl: varchar('business_logo_url', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    businessIndex: uniqueIndex('business_settings_business_idx').on(table.businessId)
  })
);
