import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import type { ReportingService } from './reporting.routes.js';
import { salesSummaryQuerySchema } from './reporting.schemas.js';

export const getSalesSummaryController = (service: ReportingService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const summary = await service.getSalesSummary(
      getAccessContext(request),
      parseSchema(salesSummaryQuerySchema, request.query)
    );
    response.status(200).json({ data: summary });
  });
