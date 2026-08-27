import type { CatalogRepository } from '../catalog/catalog.repository.js';
import { requiredRecord, toProductView } from '../catalog/product-view.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { resolveSyncPullScope } from './sync-branch-access.js';
import {
  buildProductSyncPullChangeKey,
  buildSyncEventPullChangeKey,
  buildSyncPullChangeId,
  compareSyncPullOrder,
  decodeSyncPullCursor,
  encodeSyncPullCursor
} from './sync-pull-cursor.js';
import type { SyncRepository } from './sync.repository.js';
import type { SyncPullQuery, SyncPullResult } from './sync.types.js';

export const createSyncPullService = (
  repository: SyncRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => async (context: AccessContext, query: SyncPullQuery): Promise<SyncPullResult> => {
  const scope = await resolveSyncPullScope(context, tenantCoreRepository, query.branchId);
  const cursor = decodeSyncPullCursor(query.cursor);
  const serverTime = new Date().toISOString();

  if (scope.branchIds.length === 0) {
    return {
      changes: [],
      nextCursor: query.cursor ?? null,
      serverTime
    };
  }

  const [events, products] = await Promise.all([
    repository.listPullEvents({
      branchIds: scope.branchIds,
      cursor,
      limit: query.limit,
      tenantId: context.tenantId
    }),
    catalogRepository.listProductsUpdatedSince(context.tenantId, scope.businessIds, {
      cursor,
      limit: query.limit
    })
  ]);
  const changes = [
    ...events.map((event) => ({
      change: {
        branchId: event.branchId,
        changeId: buildSyncPullChangeId(buildSyncEventPullChangeKey(event.eventId), event.updatedAt),
        changeType: 'SYNC_EVENT_APPLIED' as const,
        record: {
          createdAt: event.eventCreatedAt.toISOString(),
          deviceId: event.deviceId,
          entityId: event.entityId,
          eventId: event.eventId,
          payload: event.payload,
          type: event.type
        },
        source: 'CLIENT' as const,
        updatedAt: event.updatedAt.toISOString()
      },
      changeKey: buildSyncEventPullChangeKey(event.eventId),
      updatedAt: event.updatedAt
    })),
    ...(await toProductChanges(catalogRepository, tenantCoreRepository, context.tenantId, products))
  ]
    .sort((left, right) => compareSyncPullOrder(left, right))
    .slice(0, query.limit);

  return {
    changes: changes.map((item) => item.change),
    nextCursor: changes.length
      ? encodeSyncPullCursor({
          changeKey: changes[changes.length - 1]!.changeKey,
          updatedAt: changes[changes.length - 1]!.updatedAt
        })
      : query.cursor ?? null,
    serverTime
  };
};

const toProductChanges = async (
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository,
  tenantId: string,
  products: Awaited<ReturnType<CatalogRepository['listProductsUpdatedSince']>>
) => {
  if (products.length === 0) {
    return [];
  }

  const businessIds = [...new Set(products.map((product) => product.businessId))];
  const [businesses, categories, taxProfiles, units] = await Promise.all([
    tenantCoreRepository.listBusinesses(tenantId),
    catalogRepository.listCategories(tenantId, businessIds),
    catalogRepository.listTaxProfiles(tenantId, businessIds),
    catalogRepository.listUnits(tenantId, businessIds)
  ]);
  const businessMap = new Map(businesses.map((business) => [business.id, business]));
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
