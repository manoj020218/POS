import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { attachAccessContext } from './http/middleware/access-context.js';
import { errorHandler } from './http/middleware/error-handler.js';
import { notFoundHandler } from './http/middleware/not-found.js';
import { healthRouter } from './http/routes/health.js';
import { createRequestLogger, type AppLogger } from './lib/logger.js';
import {
  InMemoryTenantCoreRepository,
  type TenantCoreRepository
} from './modules/tenant-core/in-memory-tenant-core.repository.js';
import {
  createTenantCoreRouter,
  resolveDevelopmentAccessContext,
  type AccessContextResolver
} from './modules/tenant-core/tenant-core.routes.js';

export type AppOptions = {
  accessContextResolver?: AccessContextResolver;
  logger: AppLogger;
  tenantCoreRepository?: TenantCoreRepository;
};

export const createApp = (options: AppOptions): Express => {
  const app = express();
  const accessContextResolver = options.accessContextResolver ?? resolveDevelopmentAccessContext;
  const tenantCoreRepository =
    options.tenantCoreRepository ?? new InMemoryTenantCoreRepository();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(createRequestLogger(options.logger));
  app.use(attachAccessContext(accessContextResolver));
  app.use(healthRouter);
  app.use('/api/v1', createTenantCoreRouter(tenantCoreRepository));
  app.use(notFoundHandler);
  app.use(errorHandler(options.logger));

  return app;
};
