import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  businessSettingsQuerySchema,
  updateBusinessSettingsSchema
} from './settings.schemas.js';
import type { SettingsService } from './settings.routes.js';

export const getBusinessSettingsController = (service: SettingsService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const settings = await service.getBusinessSettings(
      getAccessContext(request),
      parseSchema(businessSettingsQuerySchema, request.query)
    );
    response.status(200).json({ data: settings });
  });

export const updateBusinessSettingsController = (service: SettingsService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const settings = await service.updateBusinessSettings(
      getAccessContext(request),
      parseSchema(updateBusinessSettingsSchema, request.body)
    );
    response.status(200).json({ data: settings });
  });
