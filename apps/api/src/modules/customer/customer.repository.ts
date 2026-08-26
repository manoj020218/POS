import type {
  CreateCustomerInput,
  CustomerRecord,
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
  updateCustomer(
    customerId: string,
    tenantId: string,
    input: UpdateCustomerInput
  ): Promise<CustomerRecord | null>;
}
