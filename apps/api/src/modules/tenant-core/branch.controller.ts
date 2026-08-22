import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { getAccessContext } from './access-context.js';
import { parseSchema } from './tenant-core.parsers.js';
import {
  branchIdSchema,
  branchQuerySchema,
  createBranchSchema,
  updateBranchSchema
} from './tenant-core.schemas.js';
import type { TenantCoreService } from './tenant-core.service.js';

export const createBranchController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const branch = await service.createBranch(
      getAccessContext(request),
      parseSchema(createBranchSchema, request.body)
    );

    response.status(201).json({ data: branch });
  });

export const listBranchesController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { businessId } = parseSchema(branchQuerySchema, request.query);
    const branches = await service.listBranches(getAccessContext(request), businessId);
    response.status(200).json({ data: branches });
  });

export const updateBranchController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { branchId } = parseSchema(branchIdSchema, request.params);
    const branch = await service.updateBranch(
      getAccessContext(request),
      branchId,
      parseSchema(updateBranchSchema, request.body)
    );

    response.status(200).json({ data: branch });
  });
