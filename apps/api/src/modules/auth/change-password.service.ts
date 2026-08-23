import { createHttpError } from '../../lib/http-error.js';
import type { AuthRepository } from './auth.repository.js';
import type { ChangePasswordInput } from './auth.types.js';
import type { createAuthAuditLogger } from './auth-audit.service.js';
import { hashPassword, verifyPassword } from './password.js';

export const createChangePasswordHandler =
  (
    repository: AuthRepository,
    auditLogger: ReturnType<typeof createAuthAuditLogger>
  ) =>
  async (input: ChangePasswordInput): Promise<void> => {
    const user = await repository.findUserById(input.userId);

    if (!user || user.tenantId !== input.tenantId) {
      throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User not found');
    }

    if (!user.isActive) {
      throw createHttpError(403, 'USER_DISABLED', 'User is disabled');
    }

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw createHttpError(401, 'INVALID_CURRENT_PASSWORD', 'Invalid current password');
    }

    if (input.currentPassword === input.newPassword) {
      throw createHttpError(400, 'PASSWORD_UNCHANGED', 'New password must differ from current password');
    }

    const updated = await repository.updateUserPassword(
      user.id,
      user.tenantId,
      await hashPassword(input.newPassword)
    );

    if (!updated) {
      throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User not found');
    }

    await repository.revokeSessionsForUser(user.id, user.tenantId, new Date());
    await auditLogger.recordPasswordChanged({ tenantId: user.tenantId, userId: user.id });
  };
