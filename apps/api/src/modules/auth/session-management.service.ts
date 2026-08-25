import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { AuthRepository } from './auth.repository.js';
import type { AuthSessionRecord, AuthSessionView } from './auth.types.js';

type RevokeSessionInput = Pick<AccessContext, 'tenantId' | 'userId'> & {
  sessionId: string;
};

export const createSessionManagementHandlers = (repository: AuthRepository) => ({
  listSessions: async (accessContext: AccessContext): Promise<AuthSessionView[]> => {
    const sessions = await repository.listSessionsForUser(accessContext.userId, accessContext.tenantId);
    return sessions.map((session) => toSessionView(session, session.id === accessContext.sessionId));
  },
  revokeUserSession: async (input: RevokeSessionInput): Promise<void> => {
    const session = await repository.findSessionById(input.sessionId);

    if (!session || session.userId !== input.userId || session.tenantId !== input.tenantId) {
      throw createHttpError(404, 'AUTH_SESSION_NOT_FOUND', 'Session not found');
    }

    await repository.revokeSession(input.sessionId, new Date());
  }
});

const toSessionView = (session: AuthSessionRecord, isCurrent: boolean): AuthSessionView => ({
  createdAt: session.createdAt.toISOString(),
  deviceInstallationId: session.deviceInstallationId,
  deviceName: session.deviceName,
  expiresAt: session.expiresAt.toISOString(),
  id: session.id,
  isCurrent,
  lastRefreshedAt: session.lastRefreshedAt.toISOString(),
  revokedAt: session.revokedAt?.toISOString(),
  userAgent: session.userAgent
});
