import type { CatalogRepository } from '../catalog/catalog.repository.js';
import { toCategoryView, toTaxProfileView, toUnitView } from '../catalog/catalog-master-view.js';
import type { CatalogUpdatedSinceInput } from '../catalog/catalog.types.js';
import { requiredRecord, toProductView } from '../catalog/product-view.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  buildCategorySyncPullChangeKey,
  buildProductSyncPullChangeKey,
  buildSyncPullChangeId,
  buildTaxProfileSyncPullChangeKey,
  buildUnitSyncPullChangeKey
} from './sync-pull-cursor.js';
import type { SyncPullChange } from './sync.types.js';

type ServerSyncPullChange = Extract<SyncPullChange, { source: 'SERVER' }>;
type SyncPullChangeEnvelope = {
  change: ServerSyncPullChange;
  changeKey: string;
  updatedAt: Date;
};

export const listServerSyncPullChanges = async (
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository,
  tenantId: string,
  businessIds: string[],
  input: CatalogUpdatedSinceInput
): Promise<SyncPullChangeEnvelope[]> => {
  const [categories, products, taxProfiles, units] = await Promise.all([
    catalogRepository.listCategoriesUpdatedSince(tenantId, businessIds, input),
    catalogRepository.listProductsUpdatedSince(tenantId, businessIds, input),
    catalogRepository.listTaxProfilesUpdatedSince(tenantId, businessIds, input),
    catalogRepository.listUnitsUpdatedSince(tenantId, businessIds, input)
  ]);
  if (
    categories.length === 0 &&
    products.length === 0 &&
    taxProfiles.length === 0 &&
    units.length === 0
  ) {
    return [];
  }

  const changedBusinessIds = [
    ...new Set(
      [...categories, ...products, ...taxProfiles, ...units].map((record) => record.businessId)
    )
  ];
  const businesses = await tenantCoreRepository.listBusinesses(tenantId);
  const businessMap = new Map(
    businesses
      .filter((business) => changedBusinessIds.includes(business.id))
      .map((business) => [business.id, business])
  );

  return [
    ...(await toProductChanges(catalogRepository, tenantId, products, businessMap)),
    ...categories.map((category) => ({
      change: {
        businessId: category.businessId,
        changeId: buildSyncPullChangeId(
          buildCategorySyncPullChangeKey(category.id),
          category.updatedAt
        ),
        changeType: 'CATEGORY_UPSERTED' as const,
        record: {
          ...toCategoryView(
            category,
            requiredRecord(businessMap, category.businessId, 'BUSINESS_NOT_FOUND', 'Business not found')
          ),
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString()
        },
        source: 'SERVER' as const,
        updatedAt: category.updatedAt.toISOString()
      },
      changeKey: buildCategorySyncPullChangeKey(category.id),
      updatedAt: category.updatedAt
    })),
    ...taxProfiles.map((taxProfile) => ({
      change: {
        businessId: taxProfile.businessId,
        changeId: buildSyncPullChangeId(
          buildTaxProfileSyncPullChangeKey(taxProfile.id),
          taxProfile.updatedAt
        ),
        changeType: 'TAX_PROFILE_UPSERTED' as const,
        record: {
          ...toTaxProfileView(
            taxProfile,
            requiredRecord(
              businessMap,
              taxProfile.businessId,
              'BUSINESS_NOT_FOUND',
              'Business not found'
            )
          ),
          createdAt: taxProfile.createdAt.toISOString(),
          updatedAt: taxProfile.updatedAt.toISOString()
        },
        source: 'SERVER' as const,
        updatedAt: taxProfile.updatedAt.toISOString()
      },
      changeKey: buildTaxProfileSyncPullChangeKey(taxProfile.id),
      updatedAt: taxProfile.updatedAt
    })),
    ...units.map((unit) => ({
      change: {
        businessId: unit.businessId,
        changeId: buildSyncPullChangeId(buildUnitSyncPullChangeKey(unit.id), unit.updatedAt),
        changeType: 'UNIT_UPSERTED' as const,
        record: {
          ...toUnitView(
            unit,
            requiredRecord(businessMap, unit.businessId, 'BUSINESS_NOT_FOUND', 'Business not found')
          ),
          createdAt: unit.createdAt.toISOString(),
          updatedAt: unit.updatedAt.toISOString()
        },
        source: 'SERVER' as const,
        updatedAt: unit.updatedAt.toISOString()
      },
      changeKey: buildUnitSyncPullChangeKey(unit.id),
      updatedAt: unit.updatedAt
    }))
  ];
};

const toProductChanges = async (
  catalogRepository: CatalogRepository,
  tenantId: string,
  products: Awaited<ReturnType<CatalogRepository['listProductsUpdatedSince']>>,
  businessMap: Map<string, Awaited<ReturnType<TenantCoreRepository['listBusinesses']>>[number]>
) => {
  if (products.length === 0) {
    return [];
  }

  const productBusinessIds = [...new Set(products.map((product) => product.businessId))];
  const [categories, taxProfiles, units] = await Promise.all([
    catalogRepository.listCategories(tenantId, productBusinessIds),
    catalogRepository.listTaxProfiles(tenantId, productBusinessIds),
    catalogRepository.listUnits(tenantId, productBusinessIds)
  ]);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  const taxProfileMap = new Map(taxProfiles.map((taxProfile) => [taxProfile.id, taxProfile]));

  return products.map((product) => {
    const view = toProductView(
      product,
      requiredRecord(businessMap, product.businessId, 'BUSINESS_NOT_FOUND', 'Business not found'),
      requiredRecord(categoryMap, product.categoryId, 'CATEGORY_NOT_FOUND', 'Category not found'),
      requiredRecord(unitMap, product.unitId, 'UNIT_NOT_FOUND', 'Unit not found'),
      requiredRecord(
        taxProfileMap,
        product.taxProfileId,
        'TAX_PROFILE_NOT_FOUND',
        'Tax profile not found'
      )
    );

    return {
      change: {
        businessId: product.businessId,
        changeId: buildSyncPullChangeId(buildProductSyncPullChangeKey(product.id), product.updatedAt),
        changeType: 'PRODUCT_UPSERTED' as const,
        record: {
          ...view,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString()
        },
        source: 'SERVER' as const,
        updatedAt: product.updatedAt.toISOString()
      },
      changeKey: buildProductSyncPullChangeKey(product.id),
      updatedAt: product.updatedAt
    };
  });
};
