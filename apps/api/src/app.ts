import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { attachAccessContext } from './http/middleware/access-context.js';
import { errorHandler } from './http/middleware/error-handler.js';
import { notFoundHandler } from './http/middleware/not-found.js';
import { healthRouter } from './http/routes/health.js';
import { createRequestLogger, type AppLogger } from './lib/logger.js';
import { createAccessTokenAccessContextResolver } from './modules/auth/access-context.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import { InMemoryAuthRepository } from './modules/auth/in-memory-auth.repository.js';
import {
  InMemoryTenantCoreRepository,
  type TenantCoreRepository
} from './modules/tenant-core/in-memory-tenant-core.repository.js';
import {
  createTenantCoreRouter,
  type AccessContextResolver
} from './modules/tenant-core/tenant-core.routes.js';

export type AppOptions = {
  accessContextResolver?: AccessContextResolver;
  authConfig?: {
    jwtSecret: string;
    refreshSecret: string;
  };
  authRepository?: AuthRepository;
  logger: AppLogger;
  tenantCoreRepository?: TenantCoreRepository;
};

export const createApp = (options: AppOptions): Express => {
  const app = express();
  const authConfig = options.authConfig ?? {
    jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
    refreshSecret: 'test-refresh-secret-0123456789-ab'
  };
  const accessContextResolver =
    options.accessContextResolver ?? createAccessTokenAccessContextResolver(authConfig.jwtSecret);
  const authRepository = options.authRepository ?? new InMemoryAuthRepository();
  const tenantCoreRepository =
    options.tenantCoreRepository ?? new InMemoryTenantCoreRepository();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(createRequestLogger(options.logger));
  app.use(healthRouter);
  app.use(attachAccessContext(accessContextResolver));
  app.use('/api/v1/auth', createAuthRouter(authRepository, authConfig));
  app.use('/api/v1', createTenantCoreRouter(tenantCoreRepository));
  app.use(notFoundHandler);
  app.use(errorHandler(options.logger));

  return app;
};
