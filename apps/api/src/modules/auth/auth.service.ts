import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import { createHttpError } from '../../lib/http-error.js';
import type { AuthRepository } from './auth.repository.js';
import { resolveGrantedPermissions } from './authorization.js';
import { createChangePasswordHandler } from './change-password.service.js';
import { createSessionManagementHandlers } from './session-management.service.js';
import { refreshTokenPayloadSchema } from './auth.schemas.js';
import type { AuthResult, AuthSessionRecord, AuthUserRecord, LoginInput, LogoutInput, RefreshInput } from './auth.types.js';
import { verifyPassword } from './password.js';
import { signToken, verifyToken } from './token.js';

export type AuthServiceConfig = {
  accessTokenTtlSeconds?: number;
  jwtSecret: string;
  refreshSecret: string;
  refreshTokenTtlSeconds?: number;
};

const defaultAccessTokenTtlSeconds = 15 * 60;
const defaultRefreshTokenTtlSeconds = 30 * 24 * 60 * 60;

export const createAuthService = (repository: AuthRepository, config: AuthServiceConfig) => ({
  changePassword: createChangePasswordHandler(repository),
  ...createSessionManagementHandlers(repository),
  login: async (input: LoginInput): Promise<AuthResult> => {
    const user = await repository.findUserByEmail(input.email);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw createHttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    ensureUserIsActive(user);
    const now = new Date();
    const sessionId = randomUUID();
    const issued = issueTokens(user, sessionId, config, now);
    const session = await repository.createSession({
      createdAt: now,
      deviceInstallationId: input.deviceInstallationId,
      deviceName: input.deviceName,
      expiresAt: issued.refreshTokenExpiresAt,
      id: sessionId,
      lastRefreshedAt: now,
      refreshTokenHash: hashToken(issued.refreshToken),
      tenantId: user.tenantId,
      userAgent: input.userAgent,
      userId: user.id
    });

    return toAuthResult(user, session, issued);
  },
  logout: async (input: LogoutInput): Promise<void> => {
    const payload = verifyToken(input.refreshToken, config.refreshSecret, refreshTokenPayloadSchema);
    const session = await repository.findSessionById(payload.sessionId);

    ensureRefreshSession(session, input.refreshToken, payload.sub, payload.tenantId, new Date());
    await repository.revokeSession(payload.sessionId, new Date());
  },
  refresh: async (input: RefreshInput): Promise<AuthResult> => {
    const now = new Date();
    const payload = verifyToken(input.refreshToken, config.refreshSecret, refreshTokenPayloadSchema, now);
    const session = await repository.findSessionById(payload.sessionId);

    const activeSession = ensureRefreshSession(
      session,
      input.refreshToken,
      payload.sub,
      payload.tenantId,
      now
    );
    const user = await repository.findUserById(payload.sub);

    if (!user) {
      throw createHttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }

    ensureUserIsActive(user);
    const issued = issueTokens(user, activeSession.id, config, now);
    const updated = await repository.updateSession(activeSession.id, {
      expiresAt: issued.refreshTokenExpiresAt,
      lastRefreshedAt: now,
      refreshTokenHash: hashToken(issued.refreshToken),
      userAgent: input.userAgent ?? activeSession.userAgent
    });

    if (!updated) {
      throw createHttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }

    return toAuthResult(user, updated, issued);
  }
});

const ensureRefreshSession = (
  session: AuthSessionRecord | null,
  refreshToken: string,
  userId: string,
  tenantId: string,
  now: Date
) => {
  if (!session || session.userId !== userId || session.tenantId !== tenantId) {
    throw createHttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  }

  if (session.revokedAt) {
    throw createHttpError(401, 'AUTH_SESSION_REVOKED', 'Session revoked');
  }

  if (session.expiresAt <= now) {
    throw createHttpError(401, 'AUTH_SESSION_EXPIRED', 'Session expired');
  }

  const expected = Buffer.from(session.refreshTokenHash, 'utf8');
  const actual = Buffer.from(hashToken(refreshToken), 'utf8');

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw createHttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  }

  return session;
};

const ensureUserIsActive = (user: AuthUserRecord) => {
  if (!user.isActive) {
    throw createHttpError(403, 'USER_DISABLED', 'User is disabled');
  }
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');

const issueTokens = (user: AuthUserRecord, sessionId: string, config: AuthServiceConfig, now: Date) => {
  const permissions = resolveGrantedPermissions(user);
  const access = signToken(
    {
      displayName: user.displayName,
      email: user.email,
      jti: randomUUID(),
      permissions,
      role: user.role,
      sessionId,
      sub: user.id,
      tenantId: user.tenantId,
      type: 'access' as const
    },
    config.jwtSecret,
    config.accessTokenTtlSeconds ?? defaultAccessTokenTtlSeconds,
    now
  );
  const refresh = signToken(
    {
      jti: randomUUID(),
      sessionId,
      sub: user.id,
      tenantId: user.tenantId,
      type: 'refresh' as const
    },
    config.refreshSecret,
    config.refreshTokenTtlSeconds ?? defaultRefreshTokenTtlSeconds,
    now
  );

  return {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt,
    permissions,
    refreshToken: refresh.token,
    refreshTokenExpiresAt: refresh.expiresAt
  };
};

const toAuthResult = (
  user: AuthUserRecord,
  session: AuthSessionRecord,
  issued: ReturnType<typeof issueTokens>
): AuthResult => ({
  accessToken: issued.accessToken,
  accessTokenExpiresAt: issued.accessTokenExpiresAt.toISOString(),
  refreshToken: issued.refreshToken,
  refreshTokenExpiresAt: issued.refreshTokenExpiresAt.toISOString(),
  session: {
    createdAt: session.createdAt.toISOString(),
    deviceInstallationId: session.deviceInstallationId,
    deviceName: session.deviceName,
    expiresAt: session.expiresAt.toISOString(),
    id: session.id,
    lastRefreshedAt: session.lastRefreshedAt.toISOString()
  },
  user: {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    permissions: issued.permissions,
    role: user.role,
    tenantId: user.tenantId
  }
});
