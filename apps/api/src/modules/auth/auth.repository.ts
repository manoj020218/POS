import type {
  AuthPasswordResetTokenRecord,
  AuthSessionRecord,
  AuthUserRecord
} from './auth.types.js';

export type CreateSessionInput = Omit<AuthSessionRecord, 'createdAt' | 'lastRefreshedAt'> & {
  createdAt: Date;
  lastRefreshedAt: Date;
};

export type CreatePasswordResetTokenInput = AuthPasswordResetTokenRecord;

export type UpdateSessionInput = Pick<
  AuthSessionRecord,
  'expiresAt' | 'lastRefreshedAt' | 'refreshTokenHash' | 'userAgent'
>;

export interface AuthRepository {
  createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<AuthPasswordResetTokenRecord>;
  createSession(input: CreateSessionInput): Promise<AuthSessionRecord>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<AuthPasswordResetTokenRecord | null>;
  findSessionById(sessionId: string): Promise<AuthSessionRecord | null>;
  listUsersForTenant(tenantId: string): Promise<AuthUserRecord[]>;
  listSessionsForUser(userId: string, tenantId: string): Promise<AuthSessionRecord[]>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(userId: string): Promise<AuthUserRecord | null>;
  revokePasswordResetTokensForUser(userId: string, tenantId: string, usedAt: Date): Promise<void>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
  revokeSessionsForUser(userId: string, tenantId: string, revokedAt: Date): Promise<void>;
  updateSession(sessionId: string, input: UpdateSessionInput): Promise<AuthSessionRecord | null>;
  updateUserPassword(
    userId: string,
    tenantId: string,
    passwordHash: string
  ): Promise<AuthUserRecord | null>;
  upsertUser(input: AuthUserRecord): Promise<AuthUserRecord>;
}
