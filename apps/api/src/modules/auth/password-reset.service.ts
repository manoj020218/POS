import { randomBytes, randomUUID } from 'node:crypto';

import { createHttpError } from '../../lib/http-error.js';
import type { AuthRepository } from './auth.repository.js';
import type { createAuthAuditLogger } from './auth-audit.service.js';
import { hashOpaqueToken } from './opaque-token.js';
import { hashPassword } from './password.js';
import type { RequestPasswordResetInput, ResetPasswordInput } from './auth.types.js';

export type PasswordResetTokenSink = (input: {
  email: string;
  expiresAt: Date;
  tenantId: string;
  token: string;
  userId: string;
}) => Promise<void> | void;

const defaultPasswordResetTokenTtlSeconds = 15 * 60;

export const createPasswordResetHandlers = (
  repository: AuthRepository,
  config: { passwordResetTokenSink?: PasswordResetTokenSink; passwordResetTokenTtlSeconds?: number },
  auditLogger: ReturnType<typeof createAuthAuditLogger>
) => ({
  requestPasswordReset: async (input: RequestPasswordResetInput): Promise<void> => {
    const user = await repository.findUserByEmail(input.email);
    if (!user || !user.isActive) return;

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (config.passwordResetTokenTtlSeconds ?? defaultPasswordResetTokenTtlSeconds) * 1000
    );
    const token = randomBytes(32).toString('base64url');

    await repository.revokePasswordResetTokensForUser(user.id, user.tenantId, now);
    await repository.createPasswordResetToken({
      createdAt: now,
      expiresAt,
      id: randomUUID(),
      tenantId: user.tenantId,
      tokenHash: hashOpaqueToken(token),
      updatedAt: now,
      userId: user.id
    });
    await config.passwordResetTokenSink?.({
      email: user.email,
      expiresAt,
      tenantId: user.tenantId,
      token,
      userId: user.id
    });
    await auditLogger.recordPasswordResetRequested({
      expiresAt,
      tenantId: user.tenantId,
      userId: user.id
    });
  },
  resetPassword: async (input: ResetPasswordInput): Promise<void> => {
    const now = new Date();
    const record = await repository.findPasswordResetTokenByHash(hashOpaqueToken(input.resetToken));

    if (!record || record.usedAt) {
      throw createHttpError(401, 'INVALID_PASSWORD_RESET_TOKEN', 'Invalid password reset token');
    }

    if (record.expiresAt <= now) {
      throw createHttpError(401, 'PASSWORD_RESET_TOKEN_EXPIRED', 'Password reset token expired');
    }

    const user = await repository.findUserById(record.userId);
    if (!user || user.tenantId !== record.tenantId) {
      throw createHttpError(401, 'INVALID_PASSWORD_RESET_TOKEN', 'Invalid password reset token');
    }

    if (!user.isActive) {
      throw createHttpError(403, 'USER_DISABLED', 'User is disabled');
    }

    await repository.updateUserPassword(user.id, user.tenantId, await hashPassword(input.newPassword));
    await repository.revokePasswordResetTokensForUser(user.id, user.tenantId, now);
    await repository.revokeSessionsForUser(user.id, user.tenantId, now);
    await auditLogger.recordPasswordResetCompleted({ tenantId: user.tenantId, userId: user.id });
  }
});
