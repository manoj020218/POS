import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { authUsers } from './auth-user.js';
import { branches } from './branch.js';
import { businesses } from './business.js';
import { sales } from './sale.js';
import { tenants } from './tenant.js';
import { terminals } from './terminal.js';

export const kioskOrderStatuses = [
  'AWAITING_PAYMENT',
  'UNPAID_TOKEN',
  'FULFILLED',
  'EXPIRED',
  'CANCELLED'
] as const;
export type KioskOrderStatus = (typeof kioskOrderStatuses)[number];

export type KioskOrderLineSnapshot = {
  lineTotal: number;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export const kioskOrders = pgTable(
  'kiosk_orders',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    terminalId: uuid('terminal_id')
      .notNull()
      .references(() => terminals.id),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => authUsers.id),
    tokenNumber: varchar('token_number', { length: 32 }).notNull(),
    tokenSequence: integer('token_sequence').notNull(),
    tokenSequenceDate: varchar('token_sequence_date', { length: 10 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('UNPAID_TOKEN'),
    items: jsonb('items').notNull().$type<KioskOrderLineSnapshot[]>(),
    totalAmount: integer('total_amount').notNull(),
    gatewayOrderId: varchar('gateway_order_id', { length: 120 }),
    gatewayPaymentRef: varchar('gateway_payment_ref', { length: 120 }),
    saleId: uuid('sale_id').references(() => sales.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    terminalTokenIndex: uniqueIndex('kiosk_orders_terminal_token_idx').on(
      table.terminalId,
      table.tokenSequenceDate,
      table.tokenSequence
    ),
    tenantBusinessStatusIndex: index('kiosk_orders_tenant_business_status_idx').on(
      table.tenantId,
      table.businessId,
      table.status
    ),
    gatewayOrderIndex: index('kiosk_orders_gateway_order_idx').on(table.gatewayOrderId)
  })
);
