import { randomUUID } from 'node:crypto';

import type { SupplierRepository } from './supplier.repository.js';
import type {
  CreateSupplierInput,
  SupplierRecord,
  UpdateSupplierInput
} from './supplier.types.js';

export class InMemorySupplierRepository implements SupplierRepository {
  private readonly suppliers = new Map<string, SupplierRecord>();

  async createSupplier(input: CreateSupplierInput) {
    const supplier: SupplierRecord = {
      ...input,
      createdAt: new Date(),
      id: randomUUID(),
      updatedAt: new Date()
    };
    this.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  async findSupplierById(supplierId: string) {
    return this.suppliers.get(supplierId) ?? null;
  }

  async listSuppliers(tenantId: string, businessIds?: string[], query?: string) {
    const allowedBusinessIds = businessIds ? new Set(businessIds) : null;
    const normalizedQuery = query?.trim().toLowerCase();

    return [...this.suppliers.values()]
      .filter((supplier) => {
        if (supplier.tenantId !== tenantId) return false;
        if (allowedBusinessIds && !allowedBusinessIds.has(supplier.businessId)) return false;
        if (!normalizedQuery) return true;

        return [supplier.name, supplier.mobile, supplier.email].some((value) =>
          value?.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          (left.mobile ?? '').localeCompare(right.mobile ?? '') ||
          left.id.localeCompare(right.id)
      );
  }

  async updateSupplier(supplierId: string, tenantId: string, input: UpdateSupplierInput) {
    const existing = this.suppliers.get(supplierId);
    if (!existing || existing.tenantId !== tenantId) {
      return null;
    }

    const updated: SupplierRecord = {
      ...existing,
      ...input,
      updatedAt: new Date()
    };
    this.suppliers.set(supplierId, updated);
    return updated;
  }
}
