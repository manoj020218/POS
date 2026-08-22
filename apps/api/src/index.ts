import 'dotenv/config';

import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDatabase } from './db/client.js';
import { createLogger } from './lib/logger.js';
import { DrizzleTenantCoreRepository } from './modules/tenant-core/drizzle-tenant-core.repository.js';

const bootstrap = async () => {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);
  const database = createDatabase(env.DATABASE_URL);
  const tenantCoreRepository = new DrizzleTenantCoreRepository(database.db);

  const app = createApp({
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
