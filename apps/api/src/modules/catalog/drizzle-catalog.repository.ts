import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { businesses } from '../../db/schema/index.js';
import { createHttpError } from '../../lib/http-error.js';
import type { CatalogRepository } from './catalog.repository.js';
import type {
  CreateCategoryInput,
  CreateProductInput,
  CreateTaxProfileInput,
  CreateUnitInput,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateTaxProfileInput,
  UpdateUnitInput
} from './catalog.types.js';
import { createDrizzleCatalogMasterStore } from './drizzle-catalog.master-store.js';
import { createDrizzleCatalogProductStore } from './drizzle-catalog.product-store.js';

export class DrizzleCatalogRepository implements CatalogRepository {
  private readonly masterStore;
  private readonly productStore;

  constructor(private readonly db: AppDatabase) {
    this.masterStore = createDrizzleCatalogMasterStore(db);
    this.productStore = createDrizzleCatalogProductStore(db);
  }

  async createCategory(input: CreateCategoryInput) {
    await this.ensureBusiness(input.tenantId, input.businessId);
    return this.masterStore.createCategory(input);
  }

  async createProduct(input: CreateProductInput) {
    await this.ensureBusiness(input.tenantId, input.businessId);
    return this.productStore.createProduct(input);
  }

  async createTaxProfile(input: CreateTaxProfileInput) {
    await this.ensureBusiness(input.tenantId, input.businessId);
    return this.masterStore.createTaxProfile(input);
  }

  async createUnit(input: CreateUnitInput) {
    await this.ensureBusiness(input.tenantId, input.businessId);
    return this.masterStore.createUnit(input);
  }

  findCategoryByCode = (...args: Parameters<CatalogRepository['findCategoryByCode']>) =>
    this.masterStore.findCategoryByCode(...args);
  findCategoryById = (...args: Parameters<CatalogRepository['findCategoryById']>) =>
    this.masterStore.findCategoryById(...args);
  findProductById = (...args: Parameters<CatalogRepository['findProductById']>) =>
    this.productStore.findProductById(...args);
  findProductBySkuOrBarcode = (
    ...args: Parameters<CatalogRepository['findProductBySkuOrBarcode']>
  ) => this.productStore.findProductBySkuOrBarcode(...args);
  findTaxProfileByCode = (...args: Parameters<CatalogRepository['findTaxProfileByCode']>) =>
    this.masterStore.findTaxProfileByCode(...args);
  findTaxProfileById = (...args: Parameters<CatalogRepository['findTaxProfileById']>) =>
    this.masterStore.findTaxProfileById(...args);
  findUnitByCode = (...args: Parameters<CatalogRepository['findUnitByCode']>) =>
    this.masterStore.findUnitByCode(...args);
  findUnitById = (...args: Parameters<CatalogRepository['findUnitById']>) =>
    this.masterStore.findUnitById(...args);
  listCategories = (...args: Parameters<CatalogRepository['listCategories']>) =>
    this.masterStore.listCategories(...args);
  listInventoryProducts = (...args: Parameters<CatalogRepository['listInventoryProducts']>) =>
    this.productStore.listInventoryProducts(...args);
  listProducts = (...args: Parameters<CatalogRepository['listProducts']>) =>
    this.productStore.listProducts(...args);
  listProductsUpdatedSince = (...args: Parameters<CatalogRepository['listProductsUpdatedSince']>) =>
    this.productStore.listProductsUpdatedSince(...args);
  searchProducts = (...args: Parameters<CatalogRepository['searchProducts']>) =>
    this.productStore.searchProducts(...args);
  listTaxProfiles = (...args: Parameters<CatalogRepository['listTaxProfiles']>) =>
    this.masterStore.listTaxProfiles(...args);
  listUnits = (...args: Parameters<CatalogRepository['listUnits']>) =>
    this.masterStore.listUnits(...args);
  updateCategory = (...args: [string, string, UpdateCategoryInput]) =>
    this.masterStore.updateCategory(...args);
  updateProduct = (...args: [string, string, UpdateProductInput]) =>
    this.productStore.updateProduct(...args);
  updateTaxProfile = (...args: [string, string, UpdateTaxProfileInput]) =>
    this.masterStore.updateTaxProfile(...args);
  updateUnit = (...args: [string, string, UpdateUnitInput]) =>
    this.masterStore.updateUnit(...args);

  private async ensureBusiness(tenantId: string, businessId: string) {
    const [record] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.tenantId, tenantId)))
      .limit(1);
    if (!record) throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
  }
}
