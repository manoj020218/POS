import cors from 'cors';
import express, { type Express, type Request } from 'express';
import helmet from 'helmet';

import { attachAccessContext } from './http/middleware/access-context.js';
import { errorHandler } from './http/middleware/error-handler.js';
import { notFoundHandler } from './http/middleware/not-found.js';
import { apiRateLimiter } from './http/middleware/rate-limit.js';
import { healthRouter } from './http/routes/health.js';
import { posAppVersionRouter } from './http/routes/pos-app-version.js';
import { createRequestLogger, type AppLogger } from './lib/logger.js';
import { createAccessTokenAccessContextResolver } from './modules/auth/access-context.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import type { AuthServiceConfig } from './modules/auth/auth.service.js';
import { InMemoryAuthRepository } from './modules/auth/in-memory-auth.repository.js';
import { createBridgeRouter } from './modules/bridge/bridge.routes.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import type { CatalogRepository } from './modules/catalog/catalog.repository.js';
import { InMemoryCatalogRepository } from './modules/catalog/in-memory-catalog.repository.js';
import type { ProductImageUploadConfig } from './modules/catalog/product-image-upload.controller.js';
import { createCustomerRouter } from './modules/customer/customer.routes.js';
import type { CustomerRepository } from './modules/customer/customer.repository.js';
import { InMemoryCustomerRepository } from './modules/customer/in-memory-customer.repository.js';
import { createInventoryRouter } from './modules/inventory/inventory.routes.js';
import type { InventoryRepository } from './modules/inventory/inventory.repository.js';
import type { InventoryMovementRecord } from './modules/inventory/inventory.types.js';
import { InMemoryKioskRepository } from './modules/kiosk/in-memory-kiosk.repository.js';
import { createKioskRouter, createKioskWebhookRouter } from './modules/kiosk/kiosk.routes.js';
import type { KioskRepository } from './modules/kiosk/kiosk.repository.js';
import { createKioskService } from './modules/kiosk/kiosk.service.js';
import type { PaymentGateway } from './modules/kiosk/payment-gateway.js';
import { createRazorpayGateway } from './modules/kiosk/razorpay-payment-gateway.js';
import { InMemoryPaymentGatewayCredentialRepository } from './modules/payment-gateways/in-memory-payment-gateway-credential.repository.js';
import { createPaymentGatewayCredentialRouter } from './modules/payment-gateways/payment-gateway-credential.routes.js';
import type { PaymentGatewayCredentialRepository } from './modules/payment-gateways/payment-gateway-credential.repository.js';
import { createPaymentGatewayCredentialService } from './modules/payment-gateways/payment-gateway-credential.service.js';
import { InMemoryPurchaseRepository } from './modules/purchase/in-memory-purchase.repository.js';
import { createPurchaseRouter } from './modules/purchase/purchase.routes.js';
import type { PurchaseRepository } from './modules/purchase/purchase.repository.js';
import type { ReportingRepository } from './modules/reporting/reporting.repository.js';
import { createReportingRouter } from './modules/reporting/reporting.routes.js';
import { createSaleRouter } from './modules/sale/sale.routes.js';
import type { SaleRepository } from './modules/sale/sale.repository.js';
import { InMemorySaleRepository } from './modules/sale/in-memory-sale.repository.js';
import { InMemorySettingsRepository } from './modules/settings/in-memory-settings.repository.js';
import { createSettingsRouter } from './modules/settings/settings.routes.js';
import type { SettingsRepository } from './modules/settings/settings.repository.js';
import { InMemorySyncRepository } from './modules/sync/in-memory-sync.repository.js';
import { createSyncRouter } from './modules/sync/sync.routes.js';
import type { SyncRepository } from './modules/sync/sync.repository.js';
import { InMemorySupplierRepository } from './modules/supplier/in-memory-supplier.repository.js';
import { createSupplierRouter } from './modules/supplier/supplier.routes.js';
import type { SupplierRepository } from './modules/supplier/supplier.repository.js';
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
  authConfig?: AuthServiceConfig;
  authRepository?: AuthRepository;
  bridgeSharedSecret?: string;
  catalogRepository?: CatalogRepository;
  credentialsEncryptionKey?: string;
  customerRepository?: CustomerRepository;
  kioskRepository?: KioskRepository;
  logger: AppLogger;
  paymentGateway?: PaymentGateway;
  paymentGatewayCredentialRepository?: PaymentGatewayCredentialRepository;
  productImageUploadConfig?: ProductImageUploadConfig;
  purchaseRepository?: PurchaseRepository;
  saleRepository?: SaleRepository & InventoryRepository & ReportingRepository;
  settingsRepository?: SettingsRepository;
  syncRepository?: SyncRepository;
  supplierRepository?: SupplierRepository;
  tenantCoreRepository?: TenantCoreRepository;
};

export const createApp = (options: AppOptions): Express => {
  const app = express();
  const authConfig = options.authConfig ?? {
    jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
    refreshSecret: 'test-refresh-secret-0123456789-ab'
  };
  const authRepository = options.authRepository ?? new InMemoryAuthRepository();
  const bridgeSharedSecret = options.bridgeSharedSecret ?? 'test-bridge-secret-0123456789-abcd';
  const catalogRepository = options.catalogRepository ?? new InMemoryCatalogRepository();
  const customerRepository = options.customerRepository ?? new InMemoryCustomerRepository();
  const sharedInventoryMovements = new Map<string, InventoryMovementRecord>();
  const saleRepository = options.saleRepository ?? new InMemorySaleRepository(sharedInventoryMovements);
  const purchaseRepository =
    options.purchaseRepository ?? new InMemoryPurchaseRepository(sharedInventoryMovements);
  const supplierRepository = options.supplierRepository ?? new InMemorySupplierRepository();
  const syncRepository = options.syncRepository ?? new InMemorySyncRepository();
  const settingsRepository = options.settingsRepository ?? new InMemorySettingsRepository();
  const tenantCoreRepository =
    options.tenantCoreRepository ?? new InMemoryTenantCoreRepository();
  const productImageUploadConfig = options.productImageUploadConfig ?? { uploadDir: './uploads/products' };
  const kioskRepository = options.kioskRepository ?? new InMemoryKioskRepository();
  // Deliberately no hardcoded fallback here (unlike bridgeSharedSecret above) —
  // a default encryption key baked into source would be a real vulnerability
  // if it were ever silently reused in production. Missing this in production
  // just means writes are refused (503) until it's actually configured; tests
  // that exercise the write path pass their own fixed key explicitly.
  const paymentGatewayCredentialRepository =
    options.paymentGatewayCredentialRepository ?? new InMemoryPaymentGatewayCredentialRepository();
  const paymentGatewayCredentialService = createPaymentGatewayCredentialService(
    paymentGatewayCredentialRepository,
    tenantCoreRepository,
    options.credentialsEncryptionKey
  );
  const paymentGateway = options.paymentGateway ?? createRazorpayGateway();
  const kioskService = createKioskService(
    kioskRepository,
    catalogRepository,
    saleRepository,
    customerRepository,
    settingsRepository,
    tenantCoreRepository,
    paymentGateway,
    paymentGatewayCredentialService
  );
  const accessContextResolver =
    options.accessContextResolver ??
    createAccessTokenAccessContextResolver(authConfig.jwtSecret, authRepository);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(
    express.json({
      limit: '1mb',
      // Kept for the Razorpay webhook, whose signature is computed over the
      // exact raw bytes sent — a re-serialized JSON.parse/stringify round
      // trip is not guaranteed to match byte-for-byte.
      verify: (request, _response, buffer) => {
        (request as Request).rawBody = buffer.toString('utf8');
      }
    })
  );
  app.use(createRequestLogger(options.logger));
  app.use(healthRouter);
  app.use(posAppVersionRouter);
  app.use(apiRateLimiter);
  app.use(attachAccessContext(accessContextResolver));
  app.use('/api/v1/auth', createAuthRouter(authRepository, tenantCoreRepository, authConfig));
  app.use(
    '/api/v1',
    createCatalogRouter(catalogRepository, settingsRepository, tenantCoreRepository, productImageUploadConfig)
  );
  app.use(
    '/api/uploads/products',
    express.static(productImageUploadConfig.uploadDir, {
      // Filenames are random UUIDs and never reused/overwritten, so a
      // long-lived immutable cache is always safe and keeps repeat views
      // (product grids, kiosk catalog) from re-fetching the same image.
      immutable: true,
      maxAge: '1y'
    })
  );
  app.use('/api/v1', createCustomerRouter(customerRepository, tenantCoreRepository));
  app.use(
    '/api/v1',
    createSyncRouter(
      syncRepository,
      saleRepository,
      purchaseRepository,
      supplierRepository,
      catalogRepository,
      customerRepository,
      settingsRepository,
      tenantCoreRepository
    )
  );
  app.use('/api/v1', createSupplierRouter(supplierRepository, tenantCoreRepository));
  app.use(
    '/api/v1',
    createPurchaseRouter(
      purchaseRepository,
      supplierRepository,
      catalogRepository,
      tenantCoreRepository
    )
  );
  app.use(
    '/api/v1',
    createSettingsRouter(settingsRepository, catalogRepository, tenantCoreRepository)
  );
  app.use(
    '/api/v1',
    createReportingRouter(
      saleRepository,
      authRepository,
      catalogRepository,
      settingsRepository,
      tenantCoreRepository
    )
  );
  app.use('/api/v1', createInventoryRouter(saleRepository, catalogRepository, tenantCoreRepository));
  app.use(
    '/api/v1',
    createSaleRouter(
      saleRepository,
      catalogRepository,
      customerRepository,
      settingsRepository,
      tenantCoreRepository
    )
  );
  app.use('/api/v1', createTenantCoreRouter(tenantCoreRepository));
  app.use('/api/v1', createKioskRouter(kioskService));
  app.use('/api/v1', createKioskWebhookRouter(kioskService));
  app.use('/api/v1', createPaymentGatewayCredentialRouter(paymentGatewayCredentialService));
  app.use('/api/bridge', createBridgeRouter(tenantCoreRepository, authRepository, bridgeSharedSecret));
  app.use(notFoundHandler);
  app.use(errorHandler(options.logger));

  return app;
};
