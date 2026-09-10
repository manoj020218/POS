import { boolean, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { businesses } from './business.js';
import { tenants } from './tenant.js';

// Extend this list as more gateway adapters are actually wired up — the
// settings UI only ever offers cards for codes in here.
export const paymentGatewayCodes = ['razorpay'] as const;
export type PaymentGatewayCode = (typeof paymentGatewayCodes)[number];

export const paymentGatewayCredentials = pgTable(
  'payment_gateway_credentials',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    gatewayCode: varchar('gateway_code', { length: 32 }).notNull(),
    isEnabled: boolean('is_enabled').notNull().default(false),
    // AES-256-GCM ciphertext (base64) of a JSON object holding this
    // gateway's actual fields (e.g. { keyId, keySecret, webhookSecret } for
    // Razorpay) — never stored or returned as plaintext. See
    // apps/api/src/lib/credential-encryption.ts.
    encryptedCredentials: text('encrypted_credentials'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    businessGatewayIndex: uniqueIndex('payment_gateway_credentials_business_gateway_idx').on(
      table.businessId,
      table.gatewayCode
    )
  })
);
