import type { AuthSessionRecord, AuthUserRecord } from './auth.types.js';

export type CreateSessionInput = Omit<AuthSessionRecord, 'createdAt' | 'lastRefreshedAt'> & {
  createdAt: Date;
  lastRefreshedAt: Date;
};

export type UpdateSessionInput = Pick<
  AuthSessionRecord,
  'expiresAt' | 'lastRefreshedAt' | 'refreshTokenHash' | 'userAgent'
>;

export interface AuthRepository {
  createSession(input: CreateSessionInput): Promise<AuthSessionRecord>;
  findSessionById(sessionId: string): Promise<AuthSessionRecord | null>;
  listSessionsForUser(userId: string, tenantId: string): Promise<AuthSessionRecord[]>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(userId: string): Promise<AuthUserRecord | null>;
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
