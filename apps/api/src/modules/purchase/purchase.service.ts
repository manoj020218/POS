import { createHttpError } from '../../lib/http-error.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { BranchRecord, BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type { SupplierRepository } from '../supplier/supplier.repository.js';
import type { PurchaseRepository } from './purchase.repository.js';
import { toPurchaseSummaryView, toPurchaseView } from './purchase-view.js';
import type {
  CreatePurchaseRequest,
  PurchaseQuery,
  PurchaseSummaryView,
  PurchaseView
} from './purchase.types.js';

export const createPurchaseService = (
  repository: PurchaseRepository,
  supplierRepository: SupplierRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  createPurchase: async (
    context: AccessContext,
    input: CreatePurchaseRequest
  ): Promise<PurchaseView> => {
    const branches = await tenantCoreRepository.listBranches(context.tenantId);
    const branch = branches.find((item) => item.id === input.branchId);
    if (!branch) throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    assertBranchAccess(context, branch.id);
    if (!branch.isActive) throw createHttpError(409, 'BRANCH_INACTIVE', 'Branch is inactive');

    ensureUniqueProducts(input.items.map((item) => item.productId));

    const [products, supplier, businesses] = await Promise.all([
      Promise.all(input.items.map((item) => catalogRepository.findProductById(item.productId))),
      input.supplierId ? supplierRepository.findSupplierById(input.supplierId) : Promise.resolve(null),
      tenantCoreRepository.listBusinesses(context.tenantId)
    ]);
    const business = requireBusiness(businesses, branch.businessId);

    if (input.supplierId) {
      if (!supplier || supplier.businessId !== branch.businessId) {
        throw createHttpError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found');
      }
      if (!supplier.isActive) {
        throw createHttpError(409, 'SUPPLIER_INACTIVE', 'Supplier is inactive');
      }
    }

    const occurredAt = input.occurredAt ?? new Date();
    const items = input.items.map((item, index) => {
      const product = products[index];
      if (!product || product.businessId !== branch.businessId) {
        throw createHttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      }
      if (!product.isActive) {
        throw createHttpError(409, 'PRODUCT_INACTIVE', 'Product is inactive');
      }
      if (!product.trackInventory) {
        throw createHttpError(
          409,
          'PURCHASE_PRODUCT_NOT_TRACKED',
          'Purchase items must track inventory'
        );
      }

      const unitCost = item.unitCost ?? product.purchasePrice;
      if (unitCost === undefined) {
        throw createHttpError(
          400,
          'PURCHASE_UNIT_COST_REQUIRED',
          'Unit cost is required when the product has no default purchase price'
        );
      }

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        totalCost: unitCost * item.quantity,
        unitCost
      };
    });
    const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const detail = await repository.createPurchase({
      inventoryMovements: items.map((item) => ({
        branchId: branch.id,
        businessId: branch.businessId,
        movementType: 'PURCHASE' as const,
        occurredAt,
        productId: item.productId,
        quantityDelta: item.quantity,
        tenantId: context.tenantId
      })),
      items: items.map((item) => ({
        ...item,
        purchaseId: '',
        tenantId: context.tenantId
      })),
      purchase: {
        branchCode: branch.code,
        branchId: branch.id,
        businessId: branch.businessId,
        createdByUserId: context.userId,
        itemCount: items.length,
        notes: input.notes,
        occurredAt,
        referenceNumber: input.referenceNumber,
        supplierId: supplier?.id,
        supplierName: supplier?.name,
        tenantId: context.tenantId,
        totalAmount,
        totalQuantity
      }
    });

    return toPurchaseView(detail, business, branch);
  },
  listPurchases: async (
    context: AccessContext,
    query: PurchaseQuery
  ): Promise<PurchaseSummaryView[]> => {
    const branches = await tenantCoreRepository.listBranches(context.tenantId);
    const accessibleBranches = resolveAccessibleBranches(context, branches, query.branchId);
    if (accessibleBranches.length === 0) return [];

    const [businesses, purchases] = await Promise.all([
      tenantCoreRepository.listBusinesses(context.tenantId),
      repository.listPurchases(
        context.tenantId,
        accessibleBranches.map((branch) => branch.id),
        query.supplierId
      )
    ]);
    const branchMap = new Map(accessibleBranches.map((branch) => [branch.id, branch] as const));

    return purchases.map((purchase) =>
      toPurchaseSummaryView(
        purchase,
        requireBusiness(businesses, purchase.businessId),
        requireBranch(branchMap, purchase.branchId)
      )
    );
  }
});

const ensureUniqueProducts = (productIds: string[]) => {
  if (new Set(productIds).size !== productIds.length) {
    throw createHttpError(
      400,
      'DUPLICATE_PURCHASE_PRODUCT',
      'Each product may appear only once in a purchase payload'
    );
  }
};

const resolveAccessibleBranches = (
  context: AccessContext,
  branches: BranchRecord[],
  requestedBranchId?: string
) => {
  if (requestedBranchId) {
    const branch = branches.find((item) => item.id === requestedBranchId);
    if (!branch) throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    assertBranchAccess(context, branch.id);
    return [branch];
  }

  return context.hasAllBranchAccess
    ? branches
    : branches.filter((branch) => context.assignedBranchIds.includes(branch.id));
};

const requireBusiness = (businesses: readonly BusinessRecord[], businessId: string) => {
  const business = businesses.find((item) => item.id === businessId);
  if (!business) throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
  return business;
};

const requireBranch = (branches: Map<string, BranchRecord>, branchId: string) => {
  const branch = branches.get(branchId);
  if (!branch) throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
  return branch;
};
