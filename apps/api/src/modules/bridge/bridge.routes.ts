import { Router, type Router as ExpressRouter } from 'express';

import { requireBridgeSecret } from '../../http/middleware/require-bridge-secret.js';
import { createAuthAuditLogger } from '../auth/auth-audit.service.js';
import type { AuthRepository } from '../auth/auth.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createBridgeProvisionService } from './bridge-provision.service.js';
import { provisionController } from './bridge.controller.js';

export const createBridgeRouter = (
  tenantCoreRepository: TenantCoreRepository,
  authRepository: AuthRepository,
  bridgeSharedSecret: string
): ExpressRouter => {
  const router = Router();
  const auditLogger = createAuthAuditLogger(authRepository);
  const service = createBridgeProvisionService(tenantCoreRepository, authRepository, auditLogger);

  router.use(requireBridgeSecret(bridgeSharedSecret));
  router.post('/provision', provisionController(service));

  return router;
};
