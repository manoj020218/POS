import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  createCustomerSchema,
  customerIdSchema,
  customerQuerySchema,
  ensureWalkInCustomerSchema,
  updateCustomerSchema
} from './customer.schemas.js';
import type { CustomerService } from './customer.routes.js';

export const createCustomerController = (service: CustomerService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const customer = await service.createCustomer(
      getAccessContext(request),
      parseSchema(createCustomerSchema, request.body)
    );
    response.status(201).json({ data: customer });
  });

export const ensureWalkInCustomerController = (service: CustomerService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const result = await service.ensureWalkInCustomer(
      getAccessContext(request),
      parseSchema(ensureWalkInCustomerSchema, request.body)
    );
    response.status(result.created ? 201 : 200).json({ data: result.customer });
  });

export const listCustomersController = (service: CustomerService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const customers = await service.listCustomers(
      getAccessContext(request),
      parseSchema(customerQuerySchema, request.query)
    );
    response.status(200).json({ data: customers });
  });

export const updateCustomerController = (service: CustomerService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { customerId } = parseSchema(customerIdSchema, request.params);
    const customer = await service.updateCustomer(
      getAccessContext(request),
      customerId,
      parseSchema(updateCustomerSchema, request.body)
    );
    response.status(200).json({ data: customer });
  });
