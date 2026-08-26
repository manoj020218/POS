import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { authUsers } from './auth-user.js';
import { branches } from './branch.js';
import { businesses } from './business.js';
import { customers } from './customer.js';
import { tenants } from './tenant.js';
import { terminals } from './terminal.js';

export const sales = pgTable(
  'sales',
  {
    branchCode: varchar('branch_code', { length: 32 }).notNull(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    cashierUserId: uuid('cashier_user_id')
      .notNull()
      .references(() => authUsers.id),
    changeAmount: integer('change_amount').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    customerId: uuid('customer_id').references(() => customers.id),
    customerName: varchar('customer_name', { length: 160 }),
    discountAmount: integer('discount_amount').notNull().default(0),
    id: uuid('id').primaryKey(),
    invoiceNumber: varchar('invoice_number', { length: 96 }).notNull(),
    invoiceSequence: integer('invoice_sequence').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    paymentMethod: varchar('payment_method', { length: 16 }).notNull(),
    subtotalAmount: integer('subtotal_amount').notNull(),
    taxAmount: integer('tax_amount').notNull().default(0),
    tenderedAmount: integer('tendered_amount').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    terminalCode: varchar('terminal_code', { length: 32 }).notNull(),
    terminalId: uuid('terminal_id')
      .notNull()
      .references(() => terminals.id),
    totalAmount: integer('total_amount').notNull()
  },
  (table) => ({
    tenantInvoiceNumberIndex: uniqueIndex('sales_tenant_invoice_number_idx').on(
      table.tenantId,
      table.invoiceNumber
    ),
    terminalSequenceIndex: uniqueIndex('sales_terminal_invoice_sequence_idx').on(
      table.terminalId,
      table.invoiceSequence
    )
  })
);
