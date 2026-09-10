import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import {
  listPaymentGatewaysController,
  updatePaymentGatewayCredentialsController
} from './payment-gateway-credential.controller.js';
import type { PaymentGatewayCredentialService } from './payment-gateway-credential.service.js';

export const createPaymentGatewayCredentialRouter = (
  service: PaymentGatewayCredentialService
): ExpressRouter => {
  const router = Router();

  router.get(
    '/payment-gateways',
    requirePermissions(['settings:manage']),
    listPaymentGatewaysController(service)
  );
  router.patch(
    '/payment-gateways/:gatewayCode',
    requirePermissions(['settings:manage']),
    updatePaymentGatewayCredentialsController(service)
  );

  return router;
};
