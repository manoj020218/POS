import type { AppPermission, AppRole } from './authorization.js';

export type AuthUserRecord = {
  displayName: string;
  email: string;
  id: string;
  isActive: boolean;
  passwordHash: string;
  permissions: AppPermission[];
  role: AppRole;
  tenantId: string;
};

export type AuthSessionRecord = {
  createdAt: Date;
  deviceInstallationId?: string;
  deviceName?: string;
  expiresAt: Date;
  id: string;
  lastRefreshedAt: Date;
  refreshTokenHash: string;
  revokedAt?: Date;
  tenantId: string;
  userAgent?: string;
  userId: string;
};

export type LoginInput = {
  deviceInstallationId?: string;
  deviceName?: string;
  email: string;
  password: string;
  userAgent?: string;
};

export type RefreshInput = {
  refreshToken: string;
  userAgent?: string;
};

export type LogoutInput = {
  refreshToken: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  tenantId: string;
  userId: string;
};

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type AuthResult = AuthTokens & {
  session: {
    createdAt: string;
    deviceInstallationId?: string;
    deviceName?: string;
    expiresAt: string;
    id: string;
    lastRefreshedAt: string;
  };
  user: {
    displayName: string;
    email: string;
    id: string;
    permissions: AppPermission[];
    role: AppRole;
    tenantId: string;
  };
};
