import { randomUUID } from 'node:crypto';

import { createHttpError } from '../../lib/http-error.js';
import type { createAuthAuditLogger } from './auth-audit.service.js';
import type { AuthRepository } from './auth.repository.js';
import type { AuthUserRecord } from './auth.types.js';
import { hashPassword, verifyPassword } from './password.js';

export const bootstrapOwnerRoles = ['BUSINESS_OWNER', 'BUSINESS_ADMIN'] as const;
export type BootstrapOwnerRole = (typeof bootstrapOwnerRoles)[number];

export type BootstrapOwnerInput = {
  displayName: string;
  email: string;
  password: string;
  role: BootstrapOwnerRole;
  tenantId: string;
  userId?: string;
};

export type BootstrapOwnerResult = {
  action: 'created' | 'unchanged' | 'updated';
  user: AuthUserRecord;
};

export const bootstrapOwnerUser = async (
  repository: AuthRepository,
  auditLogger: ReturnType<typeof createAuthAuditLogger>,
  input: BootstrapOwnerInput
): Promise<BootstrapOwnerResult> => {
  const email = input.email.trim().toLowerCase();
  const existingByEmail = await repository.findUserByEmail(email);
  const existingById = input.userId ? await repository.findUserById(input.userId) : null;

  if (existingByEmail && existingByEmail.tenantId !== input.tenantId) {
    throw createHttpError(
      409,
      'AUTH_BOOTSTRAP_EMAIL_IN_USE',
      'Bootstrap owner email is already used by another tenant'
    );
  }

  if (existingById && existingById.tenantId !== input.tenantId) {
    throw createHttpError(
      409,
      'AUTH_BOOTSTRAP_USER_TENANT_CONFLICT',
      'Bootstrap owner user id belongs to another tenant'
    );
  }

  if (existingByEmail && existingById && existingByEmail.id !== existingById.id) {
    throw createHttpError(
      409,
      'AUTH_BOOTSTRAP_ID_EMAIL_MISMATCH',
      'Bootstrap owner email and user id refer to different users'
    );
  }

  const existing = existingByEmail ?? existingById;

  if (!existing) {
    const created = await repository.upsertUser({
      displayName: input.displayName,
      email,
      id: input.userId ?? randomUUID(),
      isActive: true,
      passwordHash: await hashPassword(input.password),
      permissions: [],
      role: input.role,
      tenantId: input.tenantId
    });

    await auditLogger.recordBootstrapUserCreated({ user: created });
    return { action: 'created', user: created };
  }

  const passwordMatches = await verifyPassword(input.password, existing.passwordHash);
  const needsUpdate =
    existing.displayName !== input.displayName ||
    existing.email !== email ||
    existing.role !== input.role ||
    !existing.isActive ||
    !passwordMatches;

  if (!needsUpdate) {
    return { action: 'unchanged', user: existing };
  }

  const updated = await repository.upsertUser({
    ...existing,
    displayName: input.displayName,
    email,
    isActive: true,
    passwordHash: passwordMatches ? existing.passwordHash : await hashPassword(input.password),
    role: input.role
  });

  await auditLogger.recordBootstrapUserUpdated({
    after: updated,
    before: existing
  });

  return { action: 'updated', user: updated };
};
