import { createHttpError } from '../../lib/http-error.js';
import { resolveReadBusinessIds, resolveWriteBusiness } from '../catalog/catalog-business-scope.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type { SupplierRepository } from './supplier.repository.js';
import type {
  CreateSupplierInput,
  SupplierQuery,
  SupplierRecord,
  SupplierView,
  UpdateSupplierInput
} from './supplier.types.js';

type CreateSupplierRequest = Omit<CreateSupplierInput, 'businessId' | 'tenantId'> & {
  businessId?: string;
};

export const createSupplierService = (
  repository: SupplierRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  createSupplier: async (
    context: AccessContext,
    input: CreateSupplierRequest
  ): Promise<SupplierView> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
    const supplier = await repository.createSupplier({
      ...input,
      businessId: business.id,
      tenantId: context.tenantId
    });

    return toSupplierView(supplier, business);
  },
  listSuppliers: async (context: AccessContext, query: SupplierQuery): Promise<SupplierView[]> => {
    const businessIds = await resolveReadBusinessIds(context, tenantCoreRepository, query.businessId);
    if (businessIds.length === 0) return [];

    const [businesses, suppliers] = await Promise.all([
      tenantCoreRepository.listBusinesses(context.tenantId),
      repository.listSuppliers(context.tenantId, businessIds, query.query)
    ]);
    const businessMap = new Map(businesses.map((business) => [business.id, business] as const));

    return suppliers.map((supplier) =>
      toSupplierView(supplier, requireBusiness(businessMap, supplier.businessId))
    );
  },
  updateSupplier: async (
    context: AccessContext,
    supplierId: string,
    input: UpdateSupplierInput
  ): Promise<SupplierView> => {
    const existing = await repository.findSupplierById(supplierId);
    if (!existing) throw createHttpError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found');

    const business = await resolveWriteBusiness(context, tenantCoreRepository, existing.businessId);
    const updated = await repository.updateSupplier(supplierId, context.tenantId, input);
    if (!updated) throw createHttpError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found');

    return toSupplierView(updated, business);
  }
});

const requireBusiness = (map: Map<string, BusinessRecord>, businessId: string) => {
  const business = map.get(businessId);
  if (!business) throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
  return business;
};

const toSupplierView = (supplier: SupplierRecord, business: BusinessRecord): SupplierView => ({
  address: supplier.address,
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  email: supplier.email,
  id: supplier.id,
  isActive: supplier.isActive,
  mobile: supplier.mobile,
  name: supplier.name,
  notes: supplier.notes,
  taxNumber: supplier.taxNumber
});
