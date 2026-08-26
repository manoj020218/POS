import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  createCustomerController,
  ensureWalkInCustomerController,
  listCustomersController,
  updateCustomerController
} from './customer.controller.js';
import type { CustomerRepository } from './customer.repository.js';
import { createCustomerService } from './customer.service.js';

export type CustomerService = ReturnType<typeof createCustomerService>;

export const createCustomerRouter = (
  repository: CustomerRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createCustomerService(repository, tenantCoreRepository);

  router.get('/customers', requirePermissions(['customer:view']), listCustomersController(service));
  router.post('/customers', requirePermissions(['customer:create']), createCustomerController(service));
  router.post(
    '/customers/walk-in',
    requirePermissions(['customer:create', 'customer:view']),
    ensureWalkInCustomerController(service)
  );
  router.patch(
    '/customers/:customerId',
    requirePermissions(['customer:update']),
    updateCustomerController(service)
  );

  return router;
};
