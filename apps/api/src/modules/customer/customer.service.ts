import { createHttpError } from '../../lib/http-error.js';
import { resolveReadBusinessIds, resolveWriteBusiness } from '../catalog/catalog-business-scope.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type { CustomerRepository } from './customer.repository.js';
import { toCustomerView } from './customer-view.js';
import type {
  CreateCustomerInput,
  CustomerQuery,
  CustomerView,
  UpdateCustomerInput
} from './customer.types.js';

const WALK_IN_CUSTOMER_NAME = 'Walk-in Customer';

type CreateCustomerRequest = Omit<CreateCustomerInput, 'businessId' | 'isWalkIn' | 'name' | 'tenantId'> & {
  businessId?: string;
  name?: string;
};

type EnsureWalkInCustomerRequest = {
  businessId?: string;
};

export const createCustomerService = (
  repository: CustomerRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  createCustomer: async (
    context: AccessContext,
    input: CreateCustomerRequest
  ): Promise<CustomerView> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
    const customer = await repository.createCustomer({
      ...input,
      businessId: business.id,
      isWalkIn: false,
      name: resolveCustomerName(input),
      tenantId: context.tenantId
    });

    return toCustomerView(customer, business);
  },
  ensureWalkInCustomer: async (
    context: AccessContext,
    input: EnsureWalkInCustomerRequest
  ): Promise<{ created: boolean; customer: CustomerView }> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
    const existing = await repository.findWalkInCustomer(context.tenantId, business.id);

    if (existing) {
      return { created: false, customer: toCustomerView(existing, business) };
    }

    const customer = await repository.createCustomer({
      businessId: business.id,
      isActive: true,
      isWalkIn: true,
      name: WALK_IN_CUSTOMER_NAME,
      tenantId: context.tenantId
    });

    return { created: true, customer: toCustomerView(customer, business) };
  },
  listCustomers: async (context: AccessContext, query: CustomerQuery): Promise<CustomerView[]> => {
    const businessIds = await resolveReadBusinessIds(context, tenantCoreRepository, query.businessId);
    if (businessIds.length === 0) return [];

    const [businesses, customers] = await Promise.all([
      tenantCoreRepository.listBusinesses(context.tenantId),
      repository.listCustomers(context.tenantId, businessIds, query.query)
    ]);
    const businessMap = new Map(businesses.map((business) => [business.id, business]));

    return customers.map((customer) =>
      toCustomerView(
        customer,
        requiredBusiness(businessMap, customer.businessId)
      )
    );
  },
  updateCustomer: async (
    context: AccessContext,
    customerId: string,
    input: UpdateCustomerInput
  ): Promise<CustomerView> => {
    const existing = await repository.findCustomerById(customerId);
    if (!existing) throw createHttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

    const business = await resolveWriteBusiness(context, tenantCoreRepository, existing.businessId);
    if (existing.isWalkIn && input.isActive === false) {
      throw createHttpError(
        409,
        'DEFAULT_CUSTOMER_PROTECTED',
        'Walk-in customer cannot be deactivated'
      );
    }

    const updated = await repository.updateCustomer(customerId, context.tenantId, input);
    if (!updated) throw createHttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

    return toCustomerView(updated, business);
  }
});

const resolveCustomerName = (input: { email?: string; mobile?: string; name?: string }) => {
  if (input.name) return input.name;
  if (input.mobile) return input.mobile;
  if (input.email) return input.email;

  throw createHttpError(
    400,
    'CUSTOMER_IDENTIFIER_REQUIRED',
    'At least one of name, mobile, or email is required'
  );
};

const requiredBusiness = (map: Map<string, BusinessRecord>, businessId: string) => {
  const business = map.get(businessId);
  if (!business) throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
  return business;
};
