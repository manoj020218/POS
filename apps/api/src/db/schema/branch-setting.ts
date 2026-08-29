import { jsonb, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { tenants } from './tenant.js';

export type ReceiptPrinterProfileDocument = {
  autoPrintReceipt?: boolean;
  connectionType: 'BLUETOOTH' | 'SYSTEM' | 'TCP' | 'USB';
  name: string;
  paperWidth: '58mm' | '80mm';
  port?: number;
  target?: string;
};

export const branchSettings = pgTable(
  'branch_settings',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    receiptPrinterProfile:
      jsonb('receipt_printer_profile').$type<ReceiptPrinterProfileDocument | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    branchIndex: uniqueIndex('branch_settings_branch_idx').on(table.branchId)
  })
);
