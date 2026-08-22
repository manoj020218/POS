import { and, desc, eq } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { authSessions, authUsers, tenants } from '../../db/schema/index.js';
import { createHttpError } from '../../lib/http-error.js';
import type { AuthRepository, CreateSessionInput, UpdateSessionInput } from './auth.repository.js';
import { normalizeAuthSession, normalizeAuthUser } from './drizzle-auth.repository.utils.js';
import type { AuthSessionRecord, AuthUserRecord } from './auth.types.js';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: AppDatabase) {}

  async createSession(input: CreateSessionInput): Promise<AuthSessionRecord> {
    await this.ensureUser(input.userId, input.tenantId);
    const [session] = await this.db.insert(authSessions).values(input).returning();
    return normalizeAuthSession(this.requireRow(session, 'AUTH_SESSION_NOT_FOUND', 'Session not found'));
  }

  async findSessionById(sessionId: string): Promise<AuthSessionRecord | null> {
    const [session] = await this.db.select().from(authSessions).where(eq(authSessions.id, sessionId)).limit(1);
    return session ? normalizeAuthSession(session) : null;
  }

  async listSessionsForUser(userId: string, tenantId: string): Promise<AuthSessionRecord[]> {
    const sessions = await this.db
      .select()
      .from(authSessions)
      .where(and(eq(authSessions.userId, userId), eq(authSessions.tenantId, tenantId)))
      .orderBy(desc(authSessions.lastRefreshedAt), desc(authSessions.createdAt));

    return sessions.map(normalizeAuthSession);
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const [user] = await this.db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, normalizeEmail(email)))
      .limit(1);
    return user ? normalizeAuthUser(user) : null;
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    const [user] = await this.db.select().from(authUsers).where(eq(authUsers.id, userId)).limit(1);
    return user ? normalizeAuthUser(user) : null;
  }

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt, updatedAt: new Date() })
      .where(eq(authSessions.id, sessionId));
  }

  async revokeSessionsForUser(userId: string, tenantId: string, revokedAt: Date): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt, updatedAt: new Date() })
      .where(and(eq(authSessions.userId, userId), eq(authSessions.tenantId, tenantId)));
  }

  async updateSession(
    sessionId: string,
    input: UpdateSessionInput
  ): Promise<AuthSessionRecord | null> {
    const [session] = await this.db
      .update(authSessions)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(authSessions.id, sessionId))
      .returning();

    return session ? normalizeAuthSession(session) : null;
  }

  async updateUserPassword(
    userId: string,
    tenantId: string,
    passwordHash: string
  ): Promise<AuthUserRecord | null> {
    const [user] = await this.db
      .update(authUsers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(authUsers.id, userId), eq(authUsers.tenantId, tenantId)))
      .returning();

    return user ? normalizeAuthUser(user) : null;
  }

  async upsertUser(input: AuthUserRecord): Promise<AuthUserRecord> {
    await this.ensureTenant(input.tenantId);
    const [user] = await this.db
      .insert(authUsers)
      .values({ ...input, email: normalizeEmail(input.email) })
      .onConflictDoUpdate({
        set: {
          displayName: input.displayName,
          email: normalizeEmail(input.email),
          isActive: input.isActive,
          passwordHash: input.passwordHash,
          permissions: input.permissions,
          role: input.role,
          tenantId: input.tenantId,
          updatedAt: new Date()
        },
        target: authUsers.id
      })
      .returning();

    return normalizeAuthUser(this.requireRow(user, 'AUTH_USER_NOT_FOUND', 'User not found'));
  }

  private async ensureTenant(tenantId: string) {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant || !tenant.isActive) {
      throw createHttpError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
    }
  }

  private async ensureUser(userId: string, tenantId: string) {
    const [user] = await this.db
      .select()
      .from(authUsers)
      .where(and(eq(authUsers.id, userId), eq(authUsers.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User not found');
    }
  }

  private requireRow<T>(row: T | undefined, code: string, message: string): T {
    if (!row) {
      throw createHttpError(404, code, message);
    }

    return row;
  }
}
