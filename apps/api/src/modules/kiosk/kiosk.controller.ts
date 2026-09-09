import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  createKioskOrderSchema,
  kioskOrderIdSchema,
  kioskOrderQuerySchema,
  terminalIdParamsSchema,
  updateTerminalSettingsSchema
} from './kiosk.schemas.js';
import type { KioskService } from './kiosk.service.js';

export const createKioskOrderController = (service: KioskService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const order = await service.createKioskOrder(
      getAccessContext(request),
      parseSchema(createKioskOrderSchema, request.body)
    );
    response.status(201).json({ data: order });
  });

export const getKioskOrderController = (service: KioskService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { orderId } = parseSchema(kioskOrderIdSchema, request.params);
    const order = await service.getKioskOrder(getAccessContext(request), orderId);
    response.status(200).json({ data: order });
  });

export const listKioskOrdersController = (service: KioskService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { businessId } = parseSchema(kioskOrderQuerySchema, request.query);
    const orders = await service.listActiveKioskOrders(getAccessContext(request), businessId);
    response.status(200).json({ data: orders });
  });

export const fulfillKioskOrderController = (service: KioskService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { orderId } = parseSchema(kioskOrderIdSchema, request.params);
    const saleId = String((request.body as { saleId?: unknown }).saleId ?? '');
    const order = await service.fulfillKioskOrder(getAccessContext(request), orderId, saleId);
    response.status(200).json({ data: order });
  });

export const getTerminalSettingsController = (service: KioskService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { terminalId } = parseSchema(terminalIdParamsSchema, request.params);
    const settings = await service.getTerminalSettings(getAccessContext(request), terminalId);
    response.status(200).json({ data: settings });
  });

export const updateTerminalSettingsController = (service: KioskService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { terminalId } = parseSchema(terminalIdParamsSchema, request.params);
    const settings = await service.updateTerminalSettings(
      getAccessContext(request),
      terminalId,
      parseSchema(updateTerminalSettingsSchema, request.body)
    );
    response.status(200).json({ data: settings });
  });

export const razorpayWebhookController = (service: KioskService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const signature = request.header('x-razorpay-signature') ?? '';
    const rawBody = request.rawBody ?? JSON.stringify(request.body);
    await service.handleGatewayWebhook(rawBody, signature);
    response.status(200).json({ received: true });
  });
