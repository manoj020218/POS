import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, ilike, inArray, or } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { customers } from '../../db/schema/index.js';
import type { CustomerRepository } from './customer.repository.js';
import type {
  CreateCustomerInput,
  CustomerRecord,
  UpdateCustomerInput
} from './customer.types.js';

type CustomerRow = Omit<CustomerRecord, 'address' | 'email' | 'mobile' | 'notes' | 'taxNumber'> & {
  address: string | null;
  email: string | null;
  mobile: string | null;
  notes: string | null;
  taxNumber: string | null;
};

export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(private readonly db: AppDatabase) {}

  async createCustomer(input: CreateCustomerInput): Promise<CustomerRecord> {
    const [record] = await this.db
      .insert(customers)
      .values({ id: randomUUID(), ...input })
      .returning();

    return normalizeCustomer(requireCustomer(record));
  }

  async findCustomerById(customerId: string) {
    const [record] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    return record ? normalizeCustomer(record) : null;
  }

  async findWalkInCustomer(tenantId: string, businessId: string) {
    const [record] = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          eq(customers.businessId, businessId),
          eq(customers.isWalkIn, true)
        )
      )
      .orderBy(desc(customers.createdAt))
      .limit(1);

    return record ? normalizeCustomer(record) : null;
  }

  async listCustomers(tenantId: string, businessIds?: string[], query?: string) {
    const records = await this.db
      .select()
      .from(customers)
      .where(buildWhereClause(tenantId, businessIds, query))
      .orderBy(
        desc(customers.isWalkIn),
        asc(customers.name),
        asc(customers.mobile),
        asc(customers.id)
      );

    return records.map(normalizeCustomer);
  }

  async updateCustomer(customerId: string, tenantId: string, input: UpdateCustomerInput) {
    const [record] = await this.db
      .update(customers)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .returning();

    return record ? normalizeCustomer(record) : null;
  }
}

const buildWhereClause = (tenantId: string, businessIds?: string[], query?: string) => {
  const baseClause =
    !businessIds || businessIds.length === 0
      ? eq(customers.tenantId, tenantId)
      : and(eq(customers.tenantId, tenantId), inArray(customers.businessId, businessIds));

  if (!query) return baseClause;

  const pattern = `%${query.trim()}%`;

  return and(
    baseClause,
    or(ilike(customers.name, pattern), ilike(customers.mobile, pattern), ilike(customers.email, pattern))
  );
};

const requireCustomer = (record: CustomerRow | undefined) => {
  if (!record) {
    throw new Error('Customer row missing after insert');
  }

  return record;
};

const normalizeCustomer = (record: CustomerRow): CustomerRecord => ({
  ...record,
  address: record.address ?? undefined,
  email: record.email ?? undefined,
  mobile: record.mobile ?? undefined,
  notes: record.notes ?? undefined,
  taxNumber: record.taxNumber ?? undefined
});
