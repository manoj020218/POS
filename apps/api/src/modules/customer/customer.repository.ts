import type {
  CreateCustomerInput,
  CustomerRecord,
  CustomerUpdatedSinceInput,
  UpdateCustomerInput
} from './customer.types.js';

export interface CustomerRepository {
  createCustomer(input: CreateCustomerInput): Promise<CustomerRecord>;
  findCustomerById(customerId: string): Promise<CustomerRecord | null>;
  findWalkInCustomer(tenantId: string, businessId: string): Promise<CustomerRecord | null>;
  listCustomers(
    tenantId: string,
    businessIds?: string[],
    query?: string
  ): Promise<CustomerRecord[]>;
  listCustomersUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: CustomerUpdatedSinceInput
  ): Promise<CustomerRecord[]>;
  updateCustomer(
    customerId: string,
    tenantId: string,
    input: UpdateCustomerInput
  ): Promise<CustomerRecord | null>;
}
