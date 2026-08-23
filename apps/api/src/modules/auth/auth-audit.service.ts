import { randomUUID } from 'node:crypto';

import type { AuthRepository } from './auth.repository.js';
import type { AuthUserRecord } from './auth.types.js';

export const createAuthAuditLogger = (repository: AuthRepository) => ({
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
