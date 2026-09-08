import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { loadWorkspaceEnv } from './config/load-workspace-env.js';
import { createDatabase } from './db/client.js';
import { createLogger } from './lib/logger.js';
import { createSmtpTransport } from './lib/mailer.js';
import { DrizzleAuthRepository } from './modules/auth/drizzle-auth.repository.js';
import { createSmtpPasswordResetTokenSink } from './modules/auth/smtp-password-reset-sink.js';
import type { PasswordResetTokenSink } from './modules/auth/password-reset.service.js';
import { DrizzleCatalogRepository } from './modules/catalog/drizzle-catalog.repository.js';
import { DrizzleCustomerRepository } from './modules/customer/drizzle-customer.repository.js';
import { DrizzlePurchaseRepository } from './modules/purchase/drizzle-purchase.repository.js';
import { DrizzleSaleRepository } from './modules/sale/drizzle-sale.repository.js';
import { DrizzleSettingsRepository } from './modules/settings/drizzle-settings.repository.js';
import { DrizzleSyncRepository } from './modules/sync/drizzle-sync.repository.js';
import { DrizzleSupplierRepository } from './modules/supplier/drizzle-supplier.repository.js';
import { DrizzleTenantCoreRepository } from './modules/tenant-core/drizzle-tenant-core.repository.js';

const bootstrap = async () => {
  loadWorkspaceEnv();
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);
  const database = createDatabase(env.DATABASE_URL);
  const authRepository = new DrizzleAuthRepository(database.db);
  const catalogRepository = new DrizzleCatalogRepository(database.db);
  const customerRepository = new DrizzleCustomerRepository(database.db);
  const purchaseRepository = new DrizzlePurchaseRepository(database.db);
  const saleRepository = new DrizzleSaleRepository(database.db);
  const settingsRepository = new DrizzleSettingsRepository(database.db);
  const syncRepository = new DrizzleSyncRepository(database.db);
  const supplierRepository = new DrizzleSupplierRepository(database.db);
  const tenantCoreRepository = new DrizzleTenantCoreRepository(database.db);

  const passwordResetTokenSink: PasswordResetTokenSink | undefined =
    env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM
      ? createSmtpPasswordResetTokenSink(
          createSmtpTransport({
            host: env.SMTP_HOST,
            pass: env.SMTP_PASS,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            user: env.SMTP_USER
          }),
          env.SMTP_FROM
        )
      : undefined;

  if (!passwordResetTokenSink) {
    logger.warn('SMTP not configured — password reset requests will not deliver a token to the user');
  }
  if (!env.PUBLIC_BASE_URL) {
    logger.warn('PUBLIC_BASE_URL not configured — product image uploads will be rejected');
  }

  const app = createApp({
    authConfig: {
      jwtSecret: env.JWT_SECRET,
      passwordResetTokenSink,
      refreshSecret: env.REFRESH_SECRET
    },
    authRepository,
    bridgeSharedSecret: env.BRIDGE_SHARED_SECRET,
    catalogRepository,
    customerRepository,
    logger,
    productImageUploadConfig: {
      publicBaseUrl: env.PUBLIC_BASE_URL,
      uploadDir: env.UPLOAD_DIR
    },
    purchaseRepository,
    saleRepository,
    settingsRepository,
    syncRepository,
    supplierRepository,
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
