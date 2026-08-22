import { Router, type Request, type Router as ExpressRouter } from 'express';

import { type AccessContext } from './access-context.js';
import {
  createBranchController,
  listBranchesController,
  updateBranchController
} from './branch.controller.js';
import {
  createBusinessController,
  listBusinessesController,
  updateBusinessController
} from './business.controller.js';
import type { TenantCoreRepository } from './tenant-core.repository.js';
import { createTenantCoreService } from './tenant-core.service.js';
import {
  disableTerminalController,
  listTerminalsController,
  registerTerminalController
} from './terminal.controller.js';

export type AccessContextResolver = (
  request: Request
) => AccessContext | null | Promise<AccessContext | null>;

export const createTenantCoreRouter = (
  repository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createTenantCoreService(repository);

  router.get('/businesses', listBusinessesController(service));
  router.post('/businesses', createBusinessController(service));
  router.patch('/businesses/:businessId', updateBusinessController(service));

  router.get('/branches', listBranchesController(service));
  router.post('/branches', createBranchController(service));
  router.patch('/branches/:branchId', updateBranchController(service));

  router.get('/terminals', listTerminalsController(service));
  router.post('/terminals', registerTerminalController(service));
  router.patch('/terminals/:terminalId/disable', disableTerminalController(service));

  return router;
};
