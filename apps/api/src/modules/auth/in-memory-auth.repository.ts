import type {
  AuthRepository,
  CreatePasswordResetTokenInput,
  CreateSessionInput,
  UpdateSessionInput
} from './auth.repository.js';
import type {
  AuthPasswordResetTokenRecord,
  AuthSessionRecord,
  AuthUserRecord
} from './auth.types.js';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class InMemoryAuthRepository implements AuthRepository {
  private readonly passwordResetTokens = new Map<string, AuthPasswordResetTokenRecord>();
  private readonly sessions = new Map<string, AuthSessionRecord>();
  private readonly users = new Map<string, AuthUserRecord>();

  constructor(users: AuthUserRecord[] = []) {
    users.forEach((user) => {
      this.users.set(user.id, { ...user, email: normalizeEmail(user.email) });
    });
  }

  async createPasswordResetToken(
    input: CreatePasswordResetTokenInput
  ): Promise<AuthPasswordResetTokenRecord> {
    const record = { ...input };
    this.passwordResetTokens.set(record.id, record);
    return record;
  }

  async createSession(input: CreateSessionInput): Promise<AuthSessionRecord> {
    const session = { ...input };
    this.sessions.set(session.id, session);
    return session;
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<AuthPasswordResetTokenRecord | null> {
    for (const record of this.passwordResetTokens.values()) {
      if (record.tokenHash === tokenHash) {
        return record;
      }
    }

    return null;
  }

  async findSessionById(sessionId: string): Promise<AuthSessionRecord | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async listUsersForTenant(tenantId: string): Promise<AuthUserRecord[]> {
    return [...this.users.values()]
      .filter((user) => user.tenantId === tenantId)
      .sort(
        (left, right) =>
          left.displayName.localeCompare(right.displayName) ||
          left.email.localeCompare(right.email)
      );
  }

  async listSessionsForUser(userId: string, tenantId: string): Promise<AuthSessionRecord[]> {
    return [...this.sessions.values()]
      .filter((session) => session.userId === userId && session.tenantId === tenantId)
      .sort((left, right) => right.lastRefreshedAt.getTime() - left.lastRefreshedAt.getTime());
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const normalized = normalizeEmail(email);

    for (const user of this.users.values()) {
      if (user.email === normalized) {
        return user;
      }
    }

    return null;
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return this.users.get(userId) ?? null;
  }

  async revokePasswordResetTokensForUser(userId: string, tenantId: string, usedAt: Date): Promise<void> {
    for (const [recordId, record] of this.passwordResetTokens.entries()) {
      if (record.userId !== userId || record.tenantId !== tenantId || record.usedAt) {
        continue;
      }

      this.passwordResetTokens.set(recordId, { ...record, updatedAt: usedAt, usedAt });
    }
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.set(sessionId, { ...session, revokedAt });
  }

  async revokeSessionsForUser(userId: string, tenantId: string, revokedAt: Date): Promise<void> {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId !== userId || session.tenantId !== tenantId) {
        continue;
      }

      this.sessions.set(sessionId, { ...session, revokedAt });
    }
  }

  async updateSession(
    sessionId: string,
    input: UpdateSessionInput
  ): Promise<AuthSessionRecord | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updated = { ...session, ...input };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async updateUserPassword(
    userId: string,
    tenantId: string,
    passwordHash: string
  ): Promise<AuthUserRecord | null> {
    const user = this.users.get(userId);
    if (!user || user.tenantId !== tenantId) return null;

    const updated = { ...user, passwordHash };
    this.users.set(userId, updated);
    return updated;
  }

  async upsertUser(input: AuthUserRecord): Promise<AuthUserRecord> {
    const user = { ...input, email: normalizeEmail(input.email) };
    this.users.set(user.id, user);
    return user;
  }
}
