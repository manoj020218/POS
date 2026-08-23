import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { authUsers } from './auth-user.js';
import { branches } from './branch.js';
import { tenants } from './tenant.js';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    actorUserId: uuid('actor_user_id').references(() => authUsers.id),
    branchId: uuid('branch_id').references(() => branches.id),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tenantCreatedAtIndex: index('audit_logs_tenant_created_at_idx').on(table.tenantId, table.createdAt),
    tenantEntityIndex: index('audit_logs_tenant_entity_idx').on(
      table.tenantId,
      table.entityType,
      table.entityId
    )
  })
);
