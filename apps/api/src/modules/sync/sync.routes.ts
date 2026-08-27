import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { pushSyncEventsController } from './sync.controller.js';
import type { SyncRepository } from './sync.repository.js';
import { createSyncService } from './sync.service.js';

export type SyncService = ReturnType<typeof createSyncService>;

export const createSyncRouter = (
  repository: SyncRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createSyncService(repository, tenantCoreRepository);

  router.post('/sync/push', requirePermissions(['sync:push']), pushSyncEventsController(service));

  return router;
};
