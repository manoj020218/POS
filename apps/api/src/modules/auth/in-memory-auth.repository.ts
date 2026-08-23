import { randomUUID } from 'node:crypto';

import type {
  AuthRepository,
  CreateAuditLogInput,
  CreatePasswordResetTokenInput,
  CreateSessionInput,
  UpdateSessionInput
} from './auth.repository.js';
import type {
  AuthAuditEntityType,
  AuthAuditLogRecord,
  AuthUserBranchAccessRecord,
  AuthPasswordResetTokenRecord,
  AuthSessionRecord,
  AuthUserRecord
} from './auth.types.js';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class InMemoryAuthRepository implements AuthRepository {
  private readonly auditLogs = new Map<string, AuthAuditLogRecord>();
  private readonly branchAccess = new Map<string, AuthUserBranchAccessRecord>();
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

  async createAuditLog(input: CreateAuditLogInput): Promise<AuthAuditLogRecord> {
    const record = { ...input, createdAt: new Date() };
    this.auditLogs.set(record.id, record);
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

  async listAuditLogsForEntity(
    tenantId: string,
    entityType: AuthAuditEntityType,
    entityId: string
  ): Promise<AuthAuditLogRecord[]> {
    return [...this.auditLogs.values()]
      .filter((record) => {
        return (
          record.tenantId === tenantId &&
          record.entityType === entityType &&
          record.entityId === entityId
        );
      })
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async listBranchAccessForUser(
    userId: string,
    tenantId: string
  ): Promise<AuthUserBranchAccessRecord[]> {
    return [...this.branchAccess.values()].filter((record) => {
      return record.userId === userId && record.tenantId === tenantId;
    });
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

  async replaceBranchAccessForUser(
    userId: string,
    tenantId: string,
    branchIds: string[]
  ): Promise<AuthUserBranchAccessRecord[]> {
    for (const [recordId, record] of this.branchAccess.entries()) {
      if (record.userId === userId && record.tenantId === tenantId) {
        this.branchAccess.delete(recordId);
      }
    }

    const createdAt = new Date();
    const records = branchIds.map((branchId) => {
      const record = {
        branchId,
        createdAt,
        id: randomUUID(),
        tenantId,
        userId
      };

      this.branchAccess.set(record.id, record);
      return record;
    });

    return records;
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
