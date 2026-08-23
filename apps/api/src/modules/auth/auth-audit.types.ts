export const authAuditEntityTypes = ['auth_user'] as const;
export type AuthAuditEntityType = (typeof authAuditEntityTypes)[number];

export const authAuditActions = [
  'AUTH_PASSWORD_CHANGED',
  'AUTH_PASSWORD_RESET_REQUESTED',
  'AUTH_PASSWORD_RESET_COMPLETED',
  'AUTH_USER_CREATED',
  'AUTH_USER_UPDATED'
] as const;
export type AuthAuditAction = (typeof authAuditActions)[number];

export type AuthAuditMetadata = Record<string, boolean | number | string | string[] | null>;

export type AuthAuditLogRecord = {
  action: AuthAuditAction;
  actorUserId?: string;
  branchId?: string;
  createdAt: Date;
  entityId: string;
  entityType: AuthAuditEntityType;
  id: string;
  metadata: AuthAuditMetadata;
  tenantId: string;
};
