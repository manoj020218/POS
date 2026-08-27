import type {
  CategoryRecord,
  CreateCategoryInput,
  CreateProductInput,
  CreateTaxProfileInput,
  PaginatedResult,
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

export interface CatalogRepository {
  createCategory(input: CreateCategoryInput): Promise<CategoryRecord>;
  createProduct(input: CreateProductInput): Promise<ProductRecord>;
  createTaxProfile(input: CreateTaxProfileInput): Promise<TaxProfileRecord>;
  createUnit(input: CreateUnitInput): Promise<UnitRecord>;
  findCategoryByCode(
    tenantId: string,
    businessId: string,
    code: string
  ): Promise<CategoryRecord | null>;
  findCategoryById(categoryId: string): Promise<CategoryRecord | null>;
  findProductById(productId: string): Promise<ProductRecord | null>;
  findProductBySkuOrBarcode(
    tenantId: string,
    businessId: string,
    input: { barcode?: string; sku?: string }
  ): Promise<ProductRecord | null>;
  findTaxProfileByCode(
    tenantId: string,
    businessId: string,
    code: string
  ): Promise<TaxProfileRecord | null>;
  findTaxProfileById(taxProfileId: string): Promise<TaxProfileRecord | null>;
  findUnitByCode(tenantId: string, businessId: string, code: string): Promise<UnitRecord | null>;
  findUnitById(unitId: string): Promise<UnitRecord | null>;
  listCategories(tenantId: string, businessIds?: string[]): Promise<CategoryRecord[]>;
  listInventoryProducts(
    tenantId: string,
    businessIds: string[],
    productId?: string
  ): Promise<ProductRecord[]>;
  listProducts(
    tenantId: string,
    businessIds: string[] | undefined,
    pagination: PaginationInput
  ): Promise<PaginatedResult<ProductRecord>>;
  listProductsUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: { cursor?: { changeKey: string; updatedAt: Date }; limit: number }
  ): Promise<ProductRecord[]>;
  searchProducts(
    tenantId: string,
    businessIds: string[],
    query: string,
    limit: number
  ): Promise<ProductRecord[]>;
  listTaxProfiles(tenantId: string, businessIds?: string[]): Promise<TaxProfileRecord[]>;
  listUnits(tenantId: string, businessIds?: string[]): Promise<UnitRecord[]>;
  updateCategory(
    categoryId: string,
    tenantId: string,
    input: UpdateCategoryInput
  ): Promise<CategoryRecord | null>;
  updateProduct(
    productId: string,
    tenantId: string,
    input: UpdateProductInput
  ): Promise<ProductRecord | null>;
  updateTaxProfile(
    taxProfileId: string,
    tenantId: string,
    input: UpdateTaxProfileInput
  ): Promise<TaxProfileRecord | null>;
  updateUnit(unitId: string, tenantId: string, input: UpdateUnitInput): Promise<UnitRecord | null>;
}
