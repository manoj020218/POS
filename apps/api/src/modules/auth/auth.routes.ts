import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import {
  changePasswordController,
  createUserController,
  listUserBranchAccessController,
  listUsersController,
  listSessionsController,
  loginController,
  logoutController,
  requestPasswordResetController,
  replaceUserBranchAccessController,
  resetPasswordController,
  revokeSessionController,
  refreshController,
  updateUserController
} from './auth.controller.js';
import type { AuthRepository } from './auth.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createAuthService, type AuthServiceConfig } from './auth.service.js';

export const createAuthRouter = (
  repository: AuthRepository,
  tenantCoreRepository: TenantCoreRepository,
  config: AuthServiceConfig
): ExpressRouter => {
  const router = Router();
  const service = createAuthService(repository, tenantCoreRepository, config);

  router.post('/login', loginController(service));
  router.post('/refresh', refreshController(service));
  router.post('/logout', logoutController(service));
  router.post('/password/reset/request', requestPasswordResetController(service));
  router.post('/password/reset/confirm', resetPasswordController(service));
  router.post('/password/change', changePasswordController(service));
  router.get('/sessions', listSessionsController(service));
  router.delete('/sessions/:sessionId', revokeSessionController(service));
  router.get('/users', requirePermissions(['user:manage']), listUsersController(service));
  router.post('/users', requirePermissions(['user:manage']), createUserController(service));
  router.patch('/users/:userId', requirePermissions(['user:manage']), updateUserController(service));
  router.get(
    '/users/:userId/branches',
    requirePermissions(['user:manage']),
    listUserBranchAccessController(service)
  );
  router.put(
    '/users/:userId/branches',
    requirePermissions(['user:manage']),
    replaceUserBranchAccessController(service)
  );

  return router;
};

export type AuthService = ReturnType<typeof createAuthService>;
