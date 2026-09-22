import { randomUUID } from 'node:crypto';

import {
  buildCategorySyncPullChangeKey,
  buildProductSyncPullChangeKey,
  buildTaxProfileSyncPullChangeKey,
  buildUnitSyncPullChangeKey
} from '../sync/sync-pull-cursor.js';
import {
  byBusiness,
  byCodeThenName,
  findMasterByCode,
  listUpdatedRecordsSince,
  updateRecord
} from './catalog-change-feed.js';
import { paginateItems } from './catalog-pagination.js';
import type { CatalogRepository } from './catalog.repository.js';
import { rankProductsForSearch } from './product-search-ranking.js';
import type {
  CategoryRecord,
  CreateCategoryInput,
  CreateProductInput,
  CreateTaxProfileInput,
  CreateUnitInput,
  PaginationInput,
  ProductPriceChangeRecord,
  ProductRecord,
  ProductVariantInput,
  ProductVariantRecord,
  RecordProductPriceChangeInput,
  TaxProfileRecord,
  UnitRecord,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateTaxProfileInput,
  UpdateUnitInput
} from './catalog.types.js';

export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly categories = new Map<string, CategoryRecord>();
  private readonly priceChanges = new Map<string, ProductPriceChangeRecord>();
  private readonly products = new Map<string, ProductRecord>();
  private readonly taxProfiles = new Map<string, TaxProfileRecord>();
  private readonly units = new Map<string, UnitRecord>();
  private readonly variants = new Map<string, ProductVariantRecord>();

  async createCategory(input: CreateCategoryInput) {
    return this.store(this.categories, withTimestamps(input));
  }
  async createProduct(input: CreateProductInput) {
    return this.store(this.products, withTimestamps(input));
  }
  async createTaxProfile(input: CreateTaxProfileInput) {
    return this.store(this.taxProfiles, withTimestamps(input));
  }
  async createUnit(input: CreateUnitInput) {
    return this.store(this.units, withTimestamps(input));
  }

  async findCategoryByCode(tenantId: string, businessId: string, code: string) {
    return findMasterByCode(this.categories.values(), tenantId, businessId, code);
  }
  async findCategoryById(categoryId: string) {
    return this.categories.get(categoryId) ?? null;
  }
  async findProductById(productId: string) {
    return this.products.get(productId) ?? null;
  }
  async findProductBySkuOrBarcode(tenantId: string, businessId: string, input: { barcode?: string; sku?: string }) {
    return (
      [...this.products.values()].find((product) => {
        return (
          product.tenantId === tenantId &&
          product.businessId === businessId &&
          ((input.barcode && product.barcode === input.barcode) || (input.sku && product.sku === input.sku))
        );
      }) ?? null
    );
  }
  async findTaxProfileByCode(tenantId: string, businessId: string, code: string) {
    return findMasterByCode(this.taxProfiles.values(), tenantId, businessId, code);
  }
  async findTaxProfileById(taxProfileId: string) {
    return this.taxProfiles.get(taxProfileId) ?? null;
  }
  async findUnitByCode(tenantId: string, businessId: string, code: string) {
    return findMasterByCode(this.units.values(), tenantId, businessId, code);
  }
  async findUnitById(unitId: string) {
    return this.units.get(unitId) ?? null;
  }

  async listCategories(tenantId: string, businessIds?: string[]) {
    return byBusiness(this.categories.values(), tenantId, businessIds).sort(byCodeThenName);
  }
  async listRecentPriceChanges(tenantId: string, productId: string, limit: number) {
    return [...this.priceChanges.values()]
      .filter((change) => change.tenantId === tenantId && change.productId === productId)
      .sort((left, right) => right.changedAt.getTime() - left.changedAt.getTime())
      .slice(0, limit);
  }
  async recordProductPriceChange(input: RecordProductPriceChangeInput, keepLatest: number) {
    const record: ProductPriceChangeRecord = { ...input, changedAt: new Date(), id: randomUUID() };
    this.priceChanges.set(record.id, record);

    const forProduct = [...this.priceChanges.values()]
      .filter((change) => change.tenantId === input.tenantId && change.productId === input.productId)
      .sort((left, right) => right.changedAt.getTime() - left.changedAt.getTime());
    for (const stale of forProduct.slice(keepLatest)) {
      this.priceChanges.delete(stale.id);
    }

    return record;
  }
  async listVariantsForProducts(tenantId: string, productIds: string[]) {
    const wanted = new Set(productIds);
    return [...this.variants.values()]
      .filter((variant) => variant.tenantId === tenantId && wanted.has(variant.productId))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }
  async replaceProductVariants(
    tenantId: string,
    businessId: string,
    productId: string,
    variants: ProductVariantInput[]
  ) {
    for (const [id, variant] of this.variants.entries()) {
      if (variant.tenantId === tenantId && variant.productId === productId) {
        this.variants.delete(id);
      }
    }

    const now = new Date();
    const created = variants.map((variant, index) => {
      const record: ProductVariantRecord = {
        businessId,
        createdAt: now,
        id: randomUUID(),
        isActive: true,
        name: variant.name,
        productId,
        sellingPrice: variant.sellingPrice,
        sortOrder: index,
        tenantId,
        updatedAt: now
      };
      this.variants.set(record.id, record);
      return record;
    });

    return created;
  }
  async listCategoriesUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: Parameters<CatalogRepository['listCategoriesUpdatedSince']>[2]
  ) {
    return listUpdatedRecordsSince(
      this.categories.values(),
      tenantId,
      businessIds,
      input,
      buildCategorySyncPullChangeKey
    );
  }
  async listInventoryProducts(tenantId: string, businessIds: string[], productId?: string) {
    return byBusiness(this.products.values(), tenantId, businessIds)
      .filter((product) => product.trackInventory && (!productId || product.id === productId))
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          left.sku.localeCompare(right.sku) ||
          left.id.localeCompare(right.id)
      );
  }
  async listProducts(tenantId: string, businessIds: string[] | undefined, pagination: PaginationInput) {
    const items = byBusiness(this.products.values(), tenantId, businessIds).sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        left.sku.localeCompare(right.sku) ||
        left.id.localeCompare(right.id)
    );
    return paginateItems(items, pagination);
  }
  async listProductsUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: Parameters<CatalogRepository['listProductsUpdatedSince']>[2]
  ) {
    return listUpdatedRecordsSince(
      this.products.values(),
      tenantId,
      businessIds,
      input,
      buildProductSyncPullChangeKey
    );
  }
  async searchProducts(tenantId: string, businessIds: string[], query: string, limit: number) {
    return rankProductsForSearch(byBusiness(this.products.values(), tenantId, businessIds), query).slice(
      0,
      limit
    );
  }
  async listTaxProfiles(tenantId: string, businessIds?: string[]) {
    return byBusiness(this.taxProfiles.values(), tenantId, businessIds).sort(byCodeThenName);
  }
  async listTaxProfilesUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: Parameters<CatalogRepository['listTaxProfilesUpdatedSince']>[2]
  ) {
    return listUpdatedRecordsSince(
      this.taxProfiles.values(),
      tenantId,
      businessIds,
      input,
      buildTaxProfileSyncPullChangeKey
    );
  }
  async listUnits(tenantId: string, businessIds?: string[]) {
    return byBusiness(this.units.values(), tenantId, businessIds).sort(byCodeThenName);
  }
  async listUnitsUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: Parameters<CatalogRepository['listUnitsUpdatedSince']>[2]
  ) {
    return listUpdatedRecordsSince(
      this.units.values(),
      tenantId,
      businessIds,
      input,
      buildUnitSyncPullChangeKey
    );
  }

  async updateCategory(categoryId: string, tenantId: string, input: UpdateCategoryInput) {
    return updateRecord(this.categories, categoryId, tenantId, input as Partial<CategoryRecord>);
  }
  async updateProduct(productId: string, tenantId: string, input: UpdateProductInput) {
    return updateRecord(this.products, productId, tenantId, input as Partial<ProductRecord>);
  }
  async updateTaxProfile(taxProfileId: string, tenantId: string, input: UpdateTaxProfileInput) {
    return updateRecord(this.taxProfiles, taxProfileId, tenantId, input as Partial<TaxProfileRecord>);
  }
  async updateUnit(unitId: string, tenantId: string, input: UpdateUnitInput) {
    return updateRecord(this.units, unitId, tenantId, input as Partial<UnitRecord>);
  }

  private store<T extends { id: string }>(map: Map<string, T>, record: T) {
    map.set(record.id, record);
    return record;
  }
}

const withTimestamps = <T>(input: T) => ({
  ...input,
  createdAt: new Date(),
  id: randomUUID(),
  updatedAt: new Date()
});
