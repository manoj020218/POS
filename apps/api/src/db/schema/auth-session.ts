import { index } from 'drizzle-orm/pg-core';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { authUsers } from './auth-user.js';
import { tenants } from './tenant.js';

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    deviceInstallationId: varchar('device_installation_id', { length: 120 }),
    deviceName: varchar('device_name', { length: 120 }),
    userAgent: varchar('user_agent', { length: 240 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tenantUserIndex: index('auth_sessions_tenant_user_idx').on(table.tenantId, table.userId)
  })
);
