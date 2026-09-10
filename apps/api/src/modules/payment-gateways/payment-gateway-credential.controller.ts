import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import type { PaymentGatewayCredentialService } from './payment-gateway-credential.service.js';
import type { PaymentGatewayCode } from './payment-gateway-credential.types.js';
import {
  listPaymentGatewaysQuerySchema,
  paymentGatewayParamsSchema,
  updatePaymentGatewayCredentialsSchema
} from './payment-gateway-credential.schemas.js';

export const listPaymentGatewaysController = (service: PaymentGatewayCredentialService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { businessId } = parseSchema(listPaymentGatewaysQuerySchema, request.query);
    const cards = await service.listGatewayCards(getAccessContext(request), businessId);
    response.status(200).json({ data: cards });
  });

export const updatePaymentGatewayCredentialsController = (
  service: PaymentGatewayCredentialService
): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { gatewayCode } = parseSchema(paymentGatewayParamsSchema, request.params);
    const input = parseSchema(updatePaymentGatewayCredentialsSchema, request.body);
    const card = await service.updateGatewayCredentials(
      getAccessContext(request),
      gatewayCode as PaymentGatewayCode,
      input
    );
    response.status(200).json({ data: card });
  });
