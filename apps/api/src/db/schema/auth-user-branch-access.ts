import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

import { authUsers } from './auth-user.js';
import { branches } from './branch.js';
import { tenants } from './tenant.js';

export const authUserBranchAccess = pgTable(
  'auth_user_branch_access',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tenantUserBranchIndex: uniqueIndex('auth_user_branch_access_tenant_user_branch_idx').on(
      table.tenantId,
      table.userId,
      table.branchId
    )
  })
);
