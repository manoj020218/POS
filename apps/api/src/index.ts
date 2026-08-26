import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { loadWorkspaceEnv } from './config/load-workspace-env.js';
import { createDatabase } from './db/client.js';
import { createLogger } from './lib/logger.js';
import { DrizzleAuthRepository } from './modules/auth/drizzle-auth.repository.js';
import { DrizzleCatalogRepository } from './modules/catalog/drizzle-catalog.repository.js';
import { DrizzleCustomerRepository } from './modules/customer/drizzle-customer.repository.js';
import { DrizzleTenantCoreRepository } from './modules/tenant-core/drizzle-tenant-core.repository.js';

const bootstrap = async () => {
  loadWorkspaceEnv();
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);
  const database = createDatabase(env.DATABASE_URL);
  const authRepository = new DrizzleAuthRepository(database.db);
  const catalogRepository = new DrizzleCatalogRepository(database.db);
  const customerRepository = new DrizzleCustomerRepository(database.db);
  const tenantCoreRepository = new DrizzleTenantCoreRepository(database.db);

  const app = createApp({
    authConfig: {
      jwtSecret: env.JWT_SECRET,
      refreshSecret: env.REFRESH_SECRET
    },
    authRepository,
    catalogRepository,
    customerRepository,
    logger,
    tenantCoreRepository
  });
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API server listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down API server');

    server.close(() => {
      logger.info('HTTP server closed');
    });

    await database.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
