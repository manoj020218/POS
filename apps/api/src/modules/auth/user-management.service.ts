import { randomUUID } from 'node:crypto';

import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { AuthRepository } from './auth.repository.js';
import { hasAllPermissions, resolveGrantedPermissions } from './authorization.js';
import type { AuthManagedUserView, AuthUserRecord } from './auth.types.js';
import { hashPassword } from './password.js';

type CreateAuthUserInput = {
  actor: Pick<AccessContext, 'permissions' | 'role'>;
  displayName: string;
  email: string;
  isActive: boolean;
  password: string;
  role: AuthUserRecord['role'];
  tenantId: string;
};

type UpdateAuthUserInput = {
  actor: Pick<AccessContext, 'permissions' | 'role'>;
  actorUserId: string;
  displayName?: string;
  email?: string;
  isActive?: boolean;
  role?: AuthUserRecord['role'];
  tenantId: string;
  userId: string;
};

export const createUserManagementHandlers = (repository: AuthRepository) => ({
  createUser: async (input: CreateAuthUserInput): Promise<AuthManagedUserView> => {
    ensureAssignableUser(input.actor, { permissions: [], role: input.role });
    await ensureEmailAvailable(repository, input.email);

    const user = await repository.upsertUser({
      displayName: input.displayName,
      email: input.email,
      id: randomUUID(),
      isActive: input.isActive,
      passwordHash: await hashPassword(input.password),
      permissions: [],
      role: input.role,
      tenantId: input.tenantId
    });

    return toManagedUserView(user);
  },
  listUsers: async ({ tenantId }: Pick<AccessContext, 'tenantId'>): Promise<AuthManagedUserView[]> => {
    const users = await repository.listUsersForTenant(tenantId);
    return users.map(toManagedUserView);
  },
  updateUser: async (input: UpdateAuthUserInput): Promise<AuthManagedUserView> => {
    const existing = await repository.findUserById(input.userId);

    if (!existing || existing.tenantId !== input.tenantId) {
      throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User not found');
    }

    if (input.actorUserId === input.userId && input.isActive === false) {
      throw createHttpError(
        400,
        'AUTH_SELF_DISABLE_FORBIDDEN',
        'You cannot disable your own account'
      );
    }

    if (input.email && input.email !== existing.email) {
      await ensureEmailAvailable(repository, input.email, existing.id);
    }

    const nextUser = {
      ...existing,
      displayName: input.displayName ?? existing.displayName,
      email: input.email ?? existing.email,
      isActive: input.isActive ?? existing.isActive,
      role: input.role ?? existing.role
    };

    ensureAssignableUser(input.actor, nextUser);
    const persisted = await repository.upsertUser(nextUser);

    if (shouldRevokeSessions(existing, persisted)) {
      await repository.revokeSessionsForUser(persisted.id, persisted.tenantId, new Date());
    }

    return toManagedUserView(persisted);
  }
});

const ensureEmailAvailable = async (
  repository: AuthRepository,
  email: string,
  currentUserId?: string
) => {
  const existing = await repository.findUserByEmail(email);

  if (existing && existing.id !== currentUserId) {
    throw createHttpError(409, 'AUTH_EMAIL_IN_USE', 'Email already in use');
  }
};

const ensureAssignableUser = (
  actor: Pick<AccessContext, 'permissions' | 'role'>,
  user: Pick<AuthUserRecord, 'permissions' | 'role'>
) => {
  const actorPermissions = resolveGrantedPermissions(actor);
  const targetPermissions = resolveGrantedPermissions(user);

  if (!hasAllPermissions(actorPermissions, targetPermissions)) {
    throw createHttpError(
      403,
      'AUTH_ROLE_ASSIGNMENT_FORBIDDEN',
      'Cannot assign a role with permissions beyond your own'
    );
  }
};

const shouldRevokeSessions = (existing: AuthUserRecord, nextUser: AuthUserRecord) =>
  existing.isActive !== nextUser.isActive || existing.role !== nextUser.role;

const toManagedUserView = (user: AuthUserRecord): AuthManagedUserView => ({
  customPermissions: user.permissions,
  displayName: user.displayName,
  email: user.email,
  id: user.id,
  isActive: user.isActive,
  permissions: resolveGrantedPermissions(user),
  role: user.role,
  tenantId: user.tenantId
});
