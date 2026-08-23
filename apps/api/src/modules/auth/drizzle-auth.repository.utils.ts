import {
  authPasswordResetTokens,
  authSessions,
  authUserBranchAccess,
  authUsers
} from '../../db/schema/index.js';
import type { AppPermission, AppRole } from './authorization.js';
import type {
  AuthPasswordResetTokenRecord,
  AuthUserBranchAccessRecord,
  AuthSessionRecord,
  AuthUserRecord
} from './auth.types.js';

export const normalizeAuthPasswordResetToken = (
  record: typeof authPasswordResetTokens.$inferSelect
): AuthPasswordResetTokenRecord => ({
  createdAt: record.createdAt,
  expiresAt: record.expiresAt,
  id: record.id,
  tenantId: record.tenantId,
  tokenHash: record.tokenHash,
  updatedAt: record.updatedAt,
  usedAt: record.usedAt ?? undefined,
  userId: record.userId
});

export const normalizeAuthSession = (
  session: typeof authSessions.$inferSelect
): AuthSessionRecord => ({
  createdAt: session.createdAt,
  deviceInstallationId: session.deviceInstallationId ?? undefined,
  deviceName: session.deviceName ?? undefined,
  expiresAt: session.expiresAt,
  id: session.id,
  lastRefreshedAt: session.lastRefreshedAt,
  refreshTokenHash: session.refreshTokenHash,
  revokedAt: session.revokedAt ?? undefined,
  tenantId: session.tenantId,
  userAgent: session.userAgent ?? undefined,
  userId: session.userId
});

export const normalizeAuthUser = (user: typeof authUsers.$inferSelect): AuthUserRecord => ({
  displayName: user.displayName,
  email: user.email,
  id: user.id,
  isActive: user.isActive,
  passwordHash: user.passwordHash,
  permissions: user.permissions as AppPermission[],
  role: user.role as AppRole,
  tenantId: user.tenantId
});

export const normalizeAuthUserBranchAccess = (
  record: typeof authUserBranchAccess.$inferSelect
): AuthUserBranchAccessRecord => ({
  branchId: record.branchId,
  createdAt: record.createdAt,
  id: record.id,
  tenantId: record.tenantId,
  userId: record.userId
});
