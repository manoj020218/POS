import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { getAccessContext } from './access-context.js';
import { parseSchema } from './tenant-core.parsers.js';
import {
  registerTerminalSchema,
  terminalIdSchema,
  terminalQuerySchema
} from './tenant-core.schemas.js';
import type { TenantCoreService } from './tenant-core.service.js';

export const registerTerminalController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const terminal = await service.registerTerminal(
      getAccessContext(request),
      parseSchema(registerTerminalSchema, request.body)
    );

    response.status(201).json({ data: terminal });
  });

export const listTerminalsController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { branchId } = parseSchema(terminalQuerySchema, request.query);
    const terminals = await service.listTerminals(getAccessContext(request), branchId);
    response.status(200).json({ data: terminals });
  });

export const disableTerminalController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { terminalId } = parseSchema(terminalIdSchema, request.params);
    const terminal = await service.disableTerminal(getAccessContext(request), terminalId);
    response.status(200).json({ data: terminal });
  });
