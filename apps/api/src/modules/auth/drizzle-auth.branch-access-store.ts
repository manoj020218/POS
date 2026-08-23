import { randomUUID } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { authUserBranchAccess } from '../../db/schema/index.js';
import { normalizeAuthUserBranchAccess } from './drizzle-auth.repository.utils.js';
import type { AuthUserBranchAccessRecord } from './auth.types.js';

export const createDrizzleAuthBranchAccessStore = (db: AppDatabase) => ({
  listForUser: async (
    userId: string,
    tenantId: string
  ): Promise<AuthUserBranchAccessRecord[]> => {
    const records = await db
      .select()
      .from(authUserBranchAccess)
      .where(
        and(
          eq(authUserBranchAccess.userId, userId),
          eq(authUserBranchAccess.tenantId, tenantId)
        )
      )
      .orderBy(asc(authUserBranchAccess.createdAt));

    return records.map(normalizeAuthUserBranchAccess);
  },
  replaceForUser: async (
    userId: string,
    tenantId: string,
    branchIds: string[]
  ): Promise<AuthUserBranchAccessRecord[]> => {
    const normalizedBranchIds = [...new Set(branchIds)];

    await db
      .delete(authUserBranchAccess)
      .where(
        and(
          eq(authUserBranchAccess.userId, userId),
          eq(authUserBranchAccess.tenantId, tenantId)
        )
      );

    if (normalizedBranchIds.length === 0) {
      return [];
    }

    const createdAt = new Date();
    const rows = await db
      .insert(authUserBranchAccess)
      .values(
        normalizedBranchIds.map((branchId) => ({
          branchId,
          createdAt,
          id: randomUUID(),
          tenantId,
          userId
        }))
      )
      .returning();

    return rows.map(normalizeAuthUserBranchAccess);
  }
});
