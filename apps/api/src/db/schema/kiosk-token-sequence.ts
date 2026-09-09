import { integer, pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from './tenant.js';
import { terminals } from './terminal.js';

// Composite PK (terminal_id, sequence_date) so token numbers reset to 1 each
// day, unlike sale_sequences which counts forever per terminal.
export const kioskTokenSequences = pgTable(
  'kiosk_token_sequences',
  {
    terminalId: uuid('terminal_id')
      .notNull()
      .references(() => terminals.id),
    sequenceDate: varchar('sequence_date', { length: 10 }).notNull(),
    lastValue: integer('last_value').notNull().default(0),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.terminalId, table.sequenceDate] })
  })
);
