import { boolean, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from './tenant.js';
import { terminals } from './terminal.js';

export const terminalModes = ['BILLING_POS', 'SELF_SERVICE_KIOSK'] as const;
export type TerminalMode = (typeof terminalModes)[number];

export const terminalSettings = pgTable(
  'terminal_settings',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    terminalId: uuid('terminal_id')
      .notNull()
      .references(() => terminals.id),
    mode: varchar('mode', { length: 32 }).notNull().default('BILLING_POS'),
    kioskCollectsPayment: boolean('kiosk_collects_payment').notNull().default(false),
    printDualTokens: boolean('print_dual_tokens').notNull().default(false),
    gatewayTimeoutMinutes: integer('gateway_timeout_minutes').notNull().default(5),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    terminalIndex: uniqueIndex('terminal_settings_terminal_idx').on(table.terminalId)
  })
);
