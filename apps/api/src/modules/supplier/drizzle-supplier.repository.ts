import { randomUUID } from 'node:crypto';

import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { suppliers } from '../../db/schema/index.js';
import type { SupplierRepository } from './supplier.repository.js';
import type {
  CreateSupplierInput,
  SupplierRecord,
  UpdateSupplierInput
} from './supplier.types.js';

type SupplierRow = Omit<SupplierRecord, 'address' | 'email' | 'mobile' | 'notes' | 'taxNumber'> & {
  address: string | null;
  email: string | null;
  mobile: string | null;
  notes: string | null;
  taxNumber: string | null;
};

export class DrizzleSupplierRepository implements SupplierRepository {
  constructor(private readonly db: AppDatabase) {}

  async createSupplier(input: CreateSupplierInput): Promise<SupplierRecord> {
    const [record] = await this.db
      .insert(suppliers)
      .values({ id: randomUUID(), ...input })
      .returning();

    return normalizeSupplier(requireSupplier(record));
  }

  async findSupplierById(supplierId: string) {
    const [record] = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);

    return record ? normalizeSupplier(record) : null;
  }

  async listSuppliers(tenantId: string, businessIds?: string[], query?: string) {
    const records = await this.db
      .select()
      .from(suppliers)
      .where(buildWhereClause(tenantId, businessIds, query))
      .orderBy(asc(suppliers.name), asc(suppliers.mobile), asc(suppliers.id));

    return records.map(normalizeSupplier);
  }

  async updateSupplier(supplierId: string, tenantId: string, input: UpdateSupplierInput) {
    const [record] = await this.db
      .update(suppliers)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
      .returning();

    return record ? normalizeSupplier(record) : null;
  }
}

const buildWhereClause = (tenantId: string, businessIds?: string[], query?: string) => {
  const baseClause =
    !businessIds || businessIds.length === 0
      ? eq(suppliers.tenantId, tenantId)
      : and(eq(suppliers.tenantId, tenantId), inArray(suppliers.businessId, businessIds));

  if (!query) return baseClause;

  const pattern = `%${query.trim()}%`;

  return and(
    baseClause,
    or(ilike(suppliers.name, pattern), ilike(suppliers.mobile, pattern), ilike(suppliers.email, pattern))
  );
};

const requireSupplier = (record: SupplierRow | undefined) => {
  if (!record) {
    throw new Error('Supplier row missing after insert');
  }

  return record;
};

const normalizeSupplier = (record: SupplierRow): SupplierRecord => ({
  ...record,
  address: record.address ?? undefined,
  email: record.email ?? undefined,
  mobile: record.mobile ?? undefined,
  notes: record.notes ?? undefined,
  taxNumber: record.taxNumber ?? undefined
});
