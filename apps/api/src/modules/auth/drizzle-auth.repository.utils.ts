import { authSessions, authUsers } from '../../db/schema/index.js';
import type { AppPermission, AppRole } from './authorization.js';
import type { AuthSessionRecord, AuthUserRecord } from './auth.types.js';

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
