import { createHttpError } from '../../lib/http-error.js';
import { resolveEffectiveBusinessSettings } from '../settings/settings-defaults.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  ensureDefaultCategory,
  ensureDefaultTaxProfile,
  ensureDefaultUnit,
  generateProductSku
} from './catalog-defaults.js';
import { buildPaginationMeta } from './catalog-pagination.js';
import { resolveReadBusinessIds, resolveWriteBusiness } from './catalog-business-scope.js';
import type { CatalogRepository } from './catalog.repository.js';
import type {
  PaginatedResult,
  PaginationInput,
  ProductListQuery,
  ProductRecord,
  ProductView
} from './catalog.types.js';
import { requiredRecord, toProductView } from './product-view.js';

type ProductInput = Omit<
  ProductRecord,
  | 'businessId'
  | 'categoryId'
  | 'createdAt'
  | 'id'
  | 'sku'
  | 'taxProfileId'
  | 'tenantId'
  | 'trackInventory'
  | 'unitId'
  | 'updatedAt'
> & {
  businessId?: string;
  categoryId?: string;
  sku?: string;
  taxProfileId?: string;
  trackInventory?: boolean;
  unitId?: string;
};

export const createProductHandlers = (
  repository: CatalogRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  createProduct: async (
    context: AccessContext,
    input: ProductInput
  ): Promise<ProductView> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
    const settings = resolveEffectiveBusinessSettings(
      await settingsRepository.findBusinessSettingsByBusinessId(context.tenantId, business.id)
    );
    const related = await resolveProductRelations(repository, context.tenantId, business.id, {
      ...input,
      taxProfileId: input.taxProfileId ?? settings.defaultTaxProfileId,
      unitId: input.unitId ?? settings.defaultUnitId
    });
    const sku = await resolveProductSku(repository, context.tenantId, business.id, input.sku);
    const duplicate = await repository.findProductBySkuOrBarcode(context.tenantId, business.id, {
      barcode: input.barcode,
      sku
    });
    if (duplicate) throw createHttpError(409, 'PRODUCT_IDENTIFIER_IN_USE', 'Product identifier already in use');

    const product = await repository.createProduct({
      ...input,
      businessId: business.id,
      categoryId: related.category.id,
      sku,
      taxProfileId: related.taxProfile.id,
      tenantId: context.tenantId,
      trackInventory: input.trackInventory ?? settings.defaultTrackInventory,
      unitId: related.unit.id
    });
    return toProductView(product, business, related.category, related.unit, related.taxProfile);
  },
  listProducts: async (
    context: AccessContext,
    query: ProductListQuery
  ): Promise<PaginatedResult<ProductView>> => {
    const businessIds = await resolveReadBusinessIds(context, tenantCoreRepository, query.businessId);
    if (businessIds.length === 0) {
      return emptyPage(query);
    }

    const [businesses, productPage] = await Promise.all([
      tenantCoreRepository.listBusinesses(context.tenantId),
      repository.listProducts(context.tenantId, businessIds, {
        page: query.page,
        pageSize: query.pageSize
      })
    ]);
    if (productPage.items.length === 0) {
      return { items: [], meta: productPage.meta };
    }

    const pageBusinessIds = [...new Set(productPage.items.map((product) => product.businessId))];
    const [categories, taxProfiles, units] = await Promise.all([
      repository.listCategories(context.tenantId, pageBusinessIds),
      repository.listTaxProfiles(context.tenantId, pageBusinessIds),
      repository.listUnits(context.tenantId, pageBusinessIds)
    ]);
    const businessMap = new Map(businesses.map((business) => [business.id, business]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const unitMap = new Map(units.map((unit) => [unit.id, unit]));
    const taxProfileMap = new Map(taxProfiles.map((taxProfile) => [taxProfile.id, taxProfile]));

    return {
      items: productPage.items.map((product) =>
        toProductView(product, requiredRecord(businessMap, product.businessId, 'BUSINESS_NOT_FOUND', 'Business not found'), requiredRecord(categoryMap, product.categoryId, 'CATEGORY_NOT_FOUND', 'Category not found'), requiredRecord(unitMap, product.unitId, 'UNIT_NOT_FOUND', 'Unit not found'), requiredRecord(taxProfileMap, product.taxProfileId, 'TAX_PROFILE_NOT_FOUND', 'Tax profile not found'))
      ),
      meta: productPage.meta
    };
  },
  updateProduct: async (
    context: AccessContext,
    productId: string,
    input: Partial<ProductInput>
  ): Promise<ProductView> => {
    const existing = await repository.findProductById(productId);
    if (!existing) throw createHttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const business = await resolveWriteBusiness(context, tenantCoreRepository, existing.businessId);
    const related = await resolveProductRelations(repository, context.tenantId, business.id, {
      categoryId: input.categoryId ?? existing.categoryId,
      taxProfileId: input.taxProfileId ?? existing.taxProfileId,
      unitId: input.unitId ?? existing.unitId
    });
    const sku = input.sku ? await resolveProductSku(repository, context.tenantId, business.id, input.sku, existing.id) : undefined;
    if (input.sku || input.barcode) {
      const duplicate = await repository.findProductBySkuOrBarcode(context.tenantId, business.id, {
        barcode: input.barcode ?? existing.barcode,
        sku: sku ?? existing.sku
      });
      if (duplicate && duplicate.id !== existing.id) {
        throw createHttpError(409, 'PRODUCT_IDENTIFIER_IN_USE', 'Product identifier already in use');
      }
    }

    const updated = await repository.updateProduct(productId, context.tenantId, {
      ...input,
      ...(input.categoryId ? { categoryId: related.category.id } : {}),
      ...(sku ? { sku } : {}),
      ...(input.taxProfileId ? { taxProfileId: related.taxProfile.id } : {}),
      ...(input.unitId ? { unitId: related.unit.id } : {})
    });
    if (!updated) throw createHttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    return toProductView(updated, business, related.category, related.unit, related.taxProfile);
  }
});

const emptyPage = (pagination: PaginationInput): PaginatedResult<ProductView> => ({
  items: [],
  meta: buildPaginationMeta({ ...pagination, totalItems: 0 })
});

const resolveProductRelations = async (
  repository: CatalogRepository,
  tenantId: string,
  businessId: string,
  input: { categoryId?: string; taxProfileId?: string; unitId?: string }
) => {
  const [defaultCategory, defaultTaxProfile, defaultUnit] = await Promise.all([
    input.categoryId ? null : ensureDefaultCategory(repository, tenantId, businessId),
    input.taxProfileId ? null : ensureDefaultTaxProfile(repository, tenantId, businessId),
    input.unitId ? null : ensureDefaultUnit(repository, tenantId, businessId)
  ]);
  const [category, taxProfile, unit] = await Promise.all([
    input.categoryId ? repository.findCategoryById(input.categoryId) : Promise.resolve(defaultCategory),
    input.taxProfileId ? repository.findTaxProfileById(input.taxProfileId) : Promise.resolve(defaultTaxProfile),
    input.unitId ? repository.findUnitById(input.unitId) : Promise.resolve(defaultUnit)
  ]);

  return {
    category: requireBusinessOwned(category, businessId, 'CATEGORY_NOT_FOUND', 'Category not found'),
    taxProfile: requireBusinessOwned(
      taxProfile,
      businessId,
      'TAX_PROFILE_NOT_FOUND',
      'Tax profile not found'
    ),
    unit: requireBusinessOwned(unit, businessId, 'UNIT_NOT_FOUND', 'Unit not found')
  };
};

const resolveProductSku = async (repository: CatalogRepository, tenantId: string, businessId: string, inputSku: string | undefined, currentId?: string) => {
  const sku = inputSku ?? generateProductSku();
  const existing = await repository.findProductBySkuOrBarcode(tenantId, businessId, { sku });
  if (existing && existing.id !== currentId) {
    throw createHttpError(409, 'PRODUCT_IDENTIFIER_IN_USE', 'Product identifier already in use');
  }
  return sku;
};

const requireBusinessOwned = <T extends { businessId: string }>(
  record: T | null,
  businessId: string,
  code: string,
  message: string
): T => {
  if (!record || record.businessId !== businessId) {
    throw createHttpError(404, code, message);
  }
  return record;
};
