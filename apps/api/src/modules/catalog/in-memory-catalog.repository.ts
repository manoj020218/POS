import { randomUUID } from 'node:crypto';

import { buildProductSyncPullChangeKey } from '../sync/sync-pull-cursor.js';
import { paginateItems } from './catalog-pagination.js';
import type { CatalogRepository } from './catalog.repository.js';
import { rankProductsForSearch } from './product-search-ranking.js';
import type {
  CategoryRecord,
  CreateCategoryInput,
  CreateProductInput,
  CreateTaxProfileInput,
  PaginationInput,
  CreateUnitInput,
  ProductRecord,
  TaxProfileRecord,
  UnitRecord,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateTaxProfileInput,
  UpdateUnitInput
} from './catalog.types.js';

type MasterRecord = CategoryRecord | UnitRecord | TaxProfileRecord;

const byBusiness = <T extends { businessId: string; tenantId: string }>(
  items: Iterable<T>,
  tenantId: string,
  businessIds?: string[]
) => {
  const allowed = businessIds ? new Set(businessIds) : null;
  return [...items].filter(
    (item) => item.tenantId === tenantId && (!allowed || allowed.has(item.businessId))
  );
};

export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly categories = new Map<string, CategoryRecord>();
  private readonly products = new Map<string, ProductRecord>();
  private readonly taxProfiles = new Map<string, TaxProfileRecord>();
  private readonly units = new Map<string, UnitRecord>();

  async createCategory(input: CreateCategoryInput) {
    return this.store(this.categories, { ...input, createdAt: new Date(), id: randomUUID(), updatedAt: new Date() });
  }
  async createProduct(input: CreateProductInput) {
    return this.store(this.products, { ...input, createdAt: new Date(), id: randomUUID(), updatedAt: new Date() });
  }
  async createTaxProfile(input: CreateTaxProfileInput) {
    return this.store(this.taxProfiles, { ...input, createdAt: new Date(), id: randomUUID(), updatedAt: new Date() });
  }
  async createUnit(input: CreateUnitInput) {
    return this.store(this.units, { ...input, createdAt: new Date(), id: randomUUID(), updatedAt: new Date() });
  }

  async findCategoryByCode(tenantId: string, businessId: string, code: string) {
    return this.findMasterByCode(this.categories.values(), tenantId, businessId, code);
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
    return this.findMasterByCode(this.taxProfiles.values(), tenantId, businessId, code);
  }
  async findTaxProfileById(taxProfileId: string) {
    return this.taxProfiles.get(taxProfileId) ?? null;
  }
  async findUnitByCode(tenantId: string, businessId: string, code: string) {
    return this.findMasterByCode(this.units.values(), tenantId, businessId, code);
  }
  async findUnitById(unitId: string) {
    return this.units.get(unitId) ?? null;
  }

  async listCategories(tenantId: string, businessIds?: string[]) {
    return byBusiness(this.categories.values(), tenantId, businessIds).sort(byCodeThenName);
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
    input: { cursor?: { changeKey: string; updatedAt: Date }; limit: number }
  ) {
    return byBusiness(this.products.values(), tenantId, businessIds)
      .filter((product) => isAfterProductSyncCursor(product, input.cursor))
      .sort(compareProductSyncOrder)
      .slice(0, input.limit);
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
  async listUnits(tenantId: string, businessIds?: string[]) {
    return byBusiness(this.units.values(), tenantId, businessIds).sort(byCodeThenName);
  }

  async updateCategory(categoryId: string, tenantId: string, input: UpdateCategoryInput) {
    return this.updateRecord(this.categories, categoryId, tenantId, input as Partial<CategoryRecord>);
  }
  async updateProduct(productId: string, tenantId: string, input: UpdateProductInput) {
    return this.updateRecord(this.products, productId, tenantId, input as Partial<ProductRecord>);
  }
  async updateTaxProfile(taxProfileId: string, tenantId: string, input: UpdateTaxProfileInput) {
    return this.updateRecord(
      this.taxProfiles,
      taxProfileId,
      tenantId,
      input as Partial<TaxProfileRecord>
    );
  }
  async updateUnit(unitId: string, tenantId: string, input: UpdateUnitInput) {
    return this.updateRecord(this.units, unitId, tenantId, input as Partial<UnitRecord>);
  }

  private findMasterByCode<T extends MasterRecord>(
    items: Iterable<T>,
    tenantId: string,
    businessId: string,
    code: string
  ) {
    return (
      [...items].find(
        (item) => item.tenantId === tenantId && item.businessId === businessId && item.code === code
      ) ?? null
    );
  }

  private store<T extends { id: string }>(map: Map<string, T>, record: T) {
    map.set(record.id, record);
    return record;
  }

  private updateRecord<T extends { id: string; tenantId: string; updatedAt: Date }>(
    map: Map<string, T>,
    id: string,
    tenantId: string,
    input: Partial<T>
  ): T | null {
    const existing = map.get(id);
    if (!existing || existing.tenantId !== tenantId) {
      return null;
    }

    const updated = { ...existing, ...input, updatedAt: new Date() };
    map.set(id, updated);
    return updated;
  }
}

const byCodeThenName = (left: { code: string; name: string }, right: { code: string; name: string }) =>
  left.code.localeCompare(right.code) || left.name.localeCompare(right.name);

const compareProductSyncOrder = (left: ProductRecord, right: ProductRecord) =>
  left.updatedAt.getTime() - right.updatedAt.getTime() ||
  buildProductSyncPullChangeKey(left.id).localeCompare(buildProductSyncPullChangeKey(right.id));

const isAfterProductSyncCursor = (
  product: ProductRecord,
  cursor?: { changeKey: string; updatedAt: Date }
) => {
  if (!cursor) {
    return true;
  }

  return (
    product.updatedAt.getTime() > cursor.updatedAt.getTime() ||
    (product.updatedAt.getTime() === cursor.updatedAt.getTime() &&
      buildProductSyncPullChangeKey(product.id).localeCompare(cursor.changeKey) > 0)
  );
};
