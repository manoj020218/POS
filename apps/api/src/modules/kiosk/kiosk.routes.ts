import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import {
  createKioskOrderController,
  fulfillKioskOrderController,
  getKioskOrderController,
  getTerminalSettingsController,
  listKioskOrdersController,
  razorpayWebhookController,
  updateTerminalSettingsController
} from './kiosk.controller.js';
import type { KioskService } from './kiosk.service.js';

export const createKioskRouter = (service: KioskService): ExpressRouter => {
  const router = Router();

  router.post('/kiosk/orders', requirePermissions(['sale:create']), createKioskOrderController(service));
  router.get('/kiosk/orders', requirePermissions(['sale:create']), listKioskOrdersController(service));
  router.get('/kiosk/orders/:orderId', requirePermissions(['sale:create']), getKioskOrderController(service));
  router.post(
    '/kiosk/orders/:orderId/fulfill',
    requirePermissions(['sale:create']),
    fulfillKioskOrderController(service)
  );

  router.get(
    '/terminals/:terminalId/kiosk-settings',
    requirePermissions(['terminal:view']),
    getTerminalSettingsController(service)
  );
  router.patch(
    '/terminals/:terminalId/kiosk-settings',
    requirePermissions(['terminal:create']),
    updateTerminalSettingsController(service)
  );

  return router;
};

// Unauthenticated — Razorpay signs the payload instead of a bearer token.
export const createKioskWebhookRouter = (service: KioskService): ExpressRouter => {
  const router = Router();
  router.post('/kiosk/webhooks/razorpay', razorpayWebhookController(service));
  return router;
};
