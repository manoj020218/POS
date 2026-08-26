import { randomUUID } from 'node:crypto';

import type { CustomerRepository } from './customer.repository.js';
import type {
  CreateCustomerInput,
  CustomerRecord,
  UpdateCustomerInput
} from './customer.types.js';

const sortCustomers = (left: CustomerRecord, right: CustomerRecord) =>
  Number(right.isWalkIn) - Number(left.isWalkIn) ||
  left.name.localeCompare(right.name) ||
  (left.mobile ?? '').localeCompare(right.mobile ?? '') ||
  left.id.localeCompare(right.id);

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, CustomerRecord>();

  async createCustomer(input: CreateCustomerInput) {
    const record: CustomerRecord = {
      ...input,
      createdAt: new Date(),
      id: randomUUID(),
      updatedAt: new Date()
    };

    this.customers.set(record.id, record);
    return record;
  }

  async findCustomerById(customerId: string) {
    return this.customers.get(customerId) ?? null;
  }

  async findWalkInCustomer(tenantId: string, businessId: string) {
    return (
      [...this.customers.values()].find(
        (customer) =>
          customer.tenantId === tenantId &&
          customer.businessId === businessId &&
          customer.isWalkIn
      ) ?? null
    );
  }

  async listCustomers(tenantId: string, businessIds?: string[], query?: string) {
    const allowed = businessIds ? new Set(businessIds) : null;
    const normalizedQuery = query?.trim().toLowerCase();

    return [...this.customers.values()]
      .filter(
        (customer) =>
          customer.tenantId === tenantId &&
          (!allowed || allowed.has(customer.businessId)) &&
          matchesQuery(customer, normalizedQuery)
      )
      .sort(sortCustomers);
  }

  async updateCustomer(customerId: string, tenantId: string, input: UpdateCustomerInput) {
    const existing = this.customers.get(customerId);
    if (!existing || existing.tenantId !== tenantId) return null;

    const updated: CustomerRecord = { ...existing, ...input, updatedAt: new Date() };
    this.customers.set(customerId, updated);

    return updated;
  }
}

const matchesQuery = (customer: CustomerRecord, query?: string) => {
  if (!query) return true;

  return [customer.name, customer.mobile, customer.email]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query));
};
