import { randomUUID } from 'node:crypto';

import type { AuthRepository } from './auth.repository.js';
import type { AuthSessionRecord, AuthUserRecord } from './auth.types.js';

export const createAuthAuditLogger = (repository: AuthRepository) => ({
  recordLoginCompleted: async (input: {
    session: Pick<
      AuthSessionRecord,
      'deviceInstallationId' | 'deviceName' | 'expiresAt' | 'id' | 'tenantId' | 'userId'
    >;
  }) => {
    await repository.createAuditLog({
      action: 'AUTH_LOGIN_COMPLETED',
      actorUserId: input.session.userId,
      entityId: input.session.userId,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: {
        ...toOptionalStringMetadata('deviceInstallationId', input.session.deviceInstallationId),
        ...toOptionalStringMetadata('deviceName', input.session.deviceName),
        expiresAt: input.session.expiresAt.toISOString(),
        sessionId: input.session.id
      },
      tenantId: input.session.tenantId
    });
  },
  recordLogoutCompleted: async (input: { sessionId: string; tenantId: string; userId: string }) => {
    await repository.createAuditLog({
      action: 'AUTH_LOGOUT_COMPLETED',
      actorUserId: input.userId,
      entityId: input.userId,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: { sessionId: input.sessionId },
      tenantId: input.tenantId
    });
  },
  recordPasswordChanged: async (input: { tenantId: string; userId: string }) => {
    await repository.createAuditLog({
      action: 'AUTH_PASSWORD_CHANGED',
      actorUserId: input.userId,
      entityId: input.userId,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: { sessionRevocation: true },
      tenantId: input.tenantId
    });
  },
  recordPasswordResetCompleted: async (input: { tenantId: string; userId: string }) => {
    await repository.createAuditLog({
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      entityId: input.userId,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: { sessionRevocation: true },
      tenantId: input.tenantId
    });
  },
  recordPasswordResetRequested: async (input: {
    expiresAt: Date;
    tenantId: string;
    userId: string;
  }) => {
    await repository.createAuditLog({
      action: 'AUTH_PASSWORD_RESET_REQUESTED',
      entityId: input.userId,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: { expiresAt: input.expiresAt.toISOString() },
      tenantId: input.tenantId
    });
  },
  recordRefreshCompleted: async (input: {
    nextExpiresAt: Date;
    previousExpiresAt: Date;
    sessionId: string;
    tenantId: string;
    userId: string;
  }) => {
    await repository.createAuditLog({
      action: 'AUTH_REFRESH_COMPLETED',
      actorUserId: input.userId,
      entityId: input.userId,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: {
        nextExpiresAt: input.nextExpiresAt.toISOString(),
        previousExpiresAt: input.previousExpiresAt.toISOString(),
        sessionId: input.sessionId
      },
      tenantId: input.tenantId
    });
  },
  recordSessionRevoked: async (input: {
    actorUserId: string;
    sessionId: string;
    tenantId: string;
    userId: string;
  }) => {
    await repository.createAuditLog({
      action: 'AUTH_SESSION_REVOKED',
      actorUserId: input.actorUserId,
      entityId: input.userId,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: { sessionId: input.sessionId },
      tenantId: input.tenantId
    });
  },
  recordUserBranchAccessReplaced: async (input: {
    actorUserId: string;
    nextBranchIds: string[];
    previousBranchIds: string[];
    tenantId: string;
    userId: string;
  }) => {
    const previousBranchIds = sortIds(input.previousBranchIds);
    const nextBranchIds = sortIds(input.nextBranchIds);
    const addedBranchIds = nextBranchIds.filter((branchId) => !previousBranchIds.includes(branchId));
    const removedBranchIds = previousBranchIds.filter((branchId) => !nextBranchIds.includes(branchId));

    if (addedBranchIds.length === 0 && removedBranchIds.length === 0) {
      return;
    }

    await repository.createAuditLog({
      action: 'AUTH_USER_BRANCH_ACCESS_REPLACED',
      actorUserId: input.actorUserId,
      entityId: input.userId,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: {
        addedBranchIds,
        nextBranchIds,
        previousBranchIds,
        removedBranchIds
      },
      tenantId: input.tenantId
    });
  },
  recordUserCreated: async (input: { actorUserId: string; user: AuthUserRecord }) => {
    await repository.createAuditLog({
      action: 'AUTH_USER_CREATED',
      actorUserId: input.actorUserId,
      entityId: input.user.id,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: {
        isActive: input.user.isActive,
        role: input.user.role
      },
      tenantId: input.user.tenantId
    });
  },
  recordUserUpdated: async (input: {
    actorUserId: string;
    after: AuthUserRecord;
    before: AuthUserRecord;
  }) => {
    const changedFields = resolveChangedFields(input.before, input.after);

    if (changedFields.length === 0) {
      return;
    }

    await repository.createAuditLog({
      action: 'AUTH_USER_UPDATED',
      actorUserId: input.actorUserId,
      entityId: input.after.id,
      entityType: 'auth_user',
      id: randomUUID(),
      metadata: {
        changedFields,
        nextIsActive: input.after.isActive,
        nextRole: input.after.role,
        previousIsActive: input.before.isActive,
        previousRole: input.before.role
      },
      tenantId: input.after.tenantId
    });
  }
});

const resolveChangedFields = (before: AuthUserRecord, after: AuthUserRecord) => {
  const changedFields: string[] = [];

  if (before.displayName !== after.displayName) changedFields.push('displayName');
  if (before.email !== after.email) changedFields.push('email');
  if (before.role !== after.role) changedFields.push('role');
  if (before.isActive !== after.isActive) changedFields.push('isActive');

  return changedFields;
};

const sortIds = (ids: string[]) => [...new Set(ids)].sort();

const toOptionalStringMetadata = (key: string, value: string | undefined) =>
  value ? { [key]: value } : {};
