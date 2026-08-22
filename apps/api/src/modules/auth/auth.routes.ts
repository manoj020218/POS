import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import {
  changePasswordController,
  createUserController,
  listUsersController,
  listSessionsController,
  loginController,
  logoutController,
  requestPasswordResetController,
  resetPasswordController,
  revokeSessionController,
  refreshController,
  updateUserController
} from './auth.controller.js';
import type { AuthRepository } from './auth.repository.js';
import { createAuthService, type AuthServiceConfig } from './auth.service.js';

export const createAuthRouter = (
  repository: AuthRepository,
  config: AuthServiceConfig
): ExpressRouter => {
  const router = Router();
  const service = createAuthService(repository, config);

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

  return router;
};

export type AuthService = ReturnType<typeof createAuthService>;
