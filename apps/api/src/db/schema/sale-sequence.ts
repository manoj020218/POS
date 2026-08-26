import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tenants } from './tenant.js';
import { terminals } from './terminal.js';

export const saleSequences = pgTable('sale_sequences', {
  lastValue: integer('last_value').notNull().default(0),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  terminalId: uuid('terminal_id')
    .primaryKey()
    .references(() => terminals.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
