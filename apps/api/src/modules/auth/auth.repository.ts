import type {
  AuthAuditEntityType,
  AuthAuditLogRecord,
  AuthAuditMetadata,
  AuthUserBranchAccessRecord,
  AuthPasswordResetTokenRecord,
  AuthSessionRecord,
  AuthUserRecord
} from './auth.types.js';

export type CreateAuditLogInput = {
  action: AuthAuditLogRecord['action'];
  actorUserId?: string;
  branchId?: string;
  entityId: string;
  entityType: AuthAuditEntityType;
  id: string;
  metadata: AuthAuditMetadata;
  tenantId: string;
};

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
  createAuditLog(input: CreateAuditLogInput): Promise<AuthAuditLogRecord>;
  createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<AuthPasswordResetTokenRecord>;
  createSession(input: CreateSessionInput): Promise<AuthSessionRecord>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<AuthPasswordResetTokenRecord | null>;
  findSessionById(sessionId: string): Promise<AuthSessionRecord | null>;
  listAuditLogsForEntity(
    tenantId: string,
    entityType: AuthAuditEntityType,
    entityId: string
  ): Promise<AuthAuditLogRecord[]>;
  listBranchAccessForUser(userId: string, tenantId: string): Promise<AuthUserBranchAccessRecord[]>;
  listUsersForTenant(tenantId: string): Promise<AuthUserRecord[]>;
  listSessionsForUser(userId: string, tenantId: string): Promise<AuthSessionRecord[]>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(userId: string): Promise<AuthUserRecord | null>;
  replaceBranchAccessForUser(
    userId: string,
    tenantId: string,
    branchIds: string[]
  ): Promise<AuthUserBranchAccessRecord[]>;
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
