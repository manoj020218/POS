import { Router, type Router as ExpressRouter } from 'express';

import { loginController, logoutController, refreshController } from './auth.controller.js';
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

  return router;
};

export type AuthService = ReturnType<typeof createAuthService>;
