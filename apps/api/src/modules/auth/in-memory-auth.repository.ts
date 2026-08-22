import type { AuthRepository, CreateSessionInput, UpdateSessionInput } from './auth.repository.js';
import type { AuthSessionRecord, AuthUserRecord } from './auth.types.js';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class InMemoryAuthRepository implements AuthRepository {
  private readonly sessions = new Map<string, AuthSessionRecord>();
  private readonly users = new Map<string, AuthUserRecord>();

  constructor(users: AuthUserRecord[] = []) {
    users.forEach((user) => {
      this.users.set(user.id, { ...user, email: normalizeEmail(user.email) });
    });
  }

  async createSession(input: CreateSessionInput): Promise<AuthSessionRecord> {
    const session = { ...input };
    this.sessions.set(session.id, session);
    return session;
  }

  async findSessionById(sessionId: string): Promise<AuthSessionRecord | null> {
    return this.sessions.get(sessionId) ?? null;
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

  async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.set(sessionId, { ...session, revokedAt });
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
}
