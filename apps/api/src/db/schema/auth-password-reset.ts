import { index, uniqueIndex } from 'drizzle-orm/pg-core';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { authUsers } from './auth-user.js';
import { tenants } from './tenant.js';

export const authPasswordResetTokens = pgTable(
  'auth_password_reset_tokens',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tenantUserIndex: index('auth_password_reset_tokens_tenant_user_idx').on(
      table.tenantId,
      table.userId
    ),
    tokenHashIndex: uniqueIndex('auth_password_reset_tokens_hash_idx').on(table.tokenHash)
  })
);
