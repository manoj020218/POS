import type {
  CreateSupplierInput,
  SupplierRecord,
  UpdateSupplierInput
} from './supplier.types.js';

export interface SupplierRepository {
  createSupplier(input: CreateSupplierInput): Promise<SupplierRecord>;
  findSupplierById(supplierId: string): Promise<SupplierRecord | null>;
  listSuppliers(tenantId: string, businessIds?: string[], query?: string): Promise<SupplierRecord[]>;
  updateSupplier(
    supplierId: string,
    tenantId: string,
    input: UpdateSupplierInput
  ): Promise<SupplierRecord | null>;
}
