import { and, asc, eq } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { auditLogs } from '../../db/schema/index.js';
import type { AuthAuditEntityType, AuthAuditLogRecord } from './auth-audit.types.js';
import type { CreateAuditLogInput } from './auth.repository.js';
import { normalizeAuditLog } from './drizzle-auth.repository.utils.js';

export const createDrizzleAuthAuditStore = (db: AppDatabase) => ({
  create: async (input: CreateAuditLogInput): Promise<AuthAuditLogRecord> => {
    const [record] = await db.insert(auditLogs).values(input).returning();
    return normalizeAuditLog(record!);
  },
  listForEntity: async (
    tenantId: string,
    entityType: AuthAuditEntityType,
    entityId: string
  ): Promise<AuthAuditLogRecord[]> => {
    const records = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, tenantId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(asc(auditLogs.createdAt));

    return records.map(normalizeAuditLog);
  }
});
