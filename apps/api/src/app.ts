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
import type { AuthServiceConfig } from './modules/auth/auth.service.js';
import { InMemoryAuthRepository } from './modules/auth/in-memory-auth.repository.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import type { CatalogRepository } from './modules/catalog/catalog.repository.js';
import { InMemoryCatalogRepository } from './modules/catalog/in-memory-catalog.repository.js';
import { createCustomerRouter } from './modules/customer/customer.routes.js';
import type { CustomerRepository } from './modules/customer/customer.repository.js';
import { InMemoryCustomerRepository } from './modules/customer/in-memory-customer.repository.js';
import { createInventoryRouter } from './modules/inventory/inventory.routes.js';
import type { InventoryRepository } from './modules/inventory/inventory.repository.js';
import type { InventoryMovementRecord } from './modules/inventory/inventory.types.js';
import { InMemoryPurchaseRepository } from './modules/purchase/in-memory-purchase.repository.js';
import { createPurchaseRouter } from './modules/purchase/purchase.routes.js';
import type { PurchaseRepository } from './modules/purchase/purchase.repository.js';
import type { ReportingRepository } from './modules/reporting/reporting.repository.js';
import { createReportingRouter } from './modules/reporting/reporting.routes.js';
import { createSaleRouter } from './modules/sale/sale.routes.js';
import type { SaleRepository } from './modules/sale/sale.repository.js';
import { InMemorySaleRepository } from './modules/sale/in-memory-sale.repository.js';
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
  catalogRepository?: CatalogRepository;
  customerRepository?: CustomerRepository;
  logger: AppLogger;
  purchaseRepository?: PurchaseRepository;
  saleRepository?: SaleRepository & InventoryRepository & ReportingRepository;
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
  const catalogRepository = options.catalogRepository ?? new InMemoryCatalogRepository();
  const customerRepository = options.customerRepository ?? new InMemoryCustomerRepository();
  const sharedInventoryMovements = new Map<string, InventoryMovementRecord>();
  const saleRepository = options.saleRepository ?? new InMemorySaleRepository(sharedInventoryMovements);
  const purchaseRepository =
    options.purchaseRepository ?? new InMemoryPurchaseRepository(sharedInventoryMovements);
  const supplierRepository = options.supplierRepository ?? new InMemorySupplierRepository();
  const syncRepository = options.syncRepository ?? new InMemorySyncRepository();
  const tenantCoreRepository =
    options.tenantCoreRepository ?? new InMemoryTenantCoreRepository();
  const accessContextResolver =
    options.accessContextResolver ??
    createAccessTokenAccessContextResolver(authConfig.jwtSecret, authRepository);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(createRequestLogger(options.logger));
  app.use(healthRouter);
  app.use(attachAccessContext(accessContextResolver));
  app.use('/api/v1/auth', createAuthRouter(authRepository, tenantCoreRepository, authConfig));
  app.use('/api/v1', createCatalogRouter(catalogRepository, tenantCoreRepository));
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
  app.use('/api/v1', createReportingRouter(saleRepository, tenantCoreRepository));
  app.use('/api/v1', createInventoryRouter(saleRepository, catalogRepository, tenantCoreRepository));
  app.use(
    '/api/v1',
    createSaleRouter(saleRepository, catalogRepository, customerRepository, tenantCoreRepository)
  );
  app.use('/api/v1', createTenantCoreRouter(tenantCoreRepository));
  app.use(notFoundHandler);
  app.use(errorHandler(options.logger));

  return app;
};
