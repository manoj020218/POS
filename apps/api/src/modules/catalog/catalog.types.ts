export type CategoryRecord = {
  businessId: string;
  code: string;
  createdAt: Date;
  id: string;
  isActive: boolean;
  name: string;
  tenantId: string;
  updatedAt: Date;
};

export type UnitRecord = {
  businessId: string;
  code: string;
  createdAt: Date;
  id: string;
  isActive: boolean;
  name: string;
  precision: number;
  symbol?: string;
  tenantId: string;
  updatedAt: Date;
};

export type TaxProfileRecord = {
  businessId: string;
  code: string;
  createdAt: Date;
  id: string;
  isActive: boolean;
  name: string;
  rateBasisPoints: number;
  tenantId: string;
  updatedAt: Date;
};

export type ProductRecord = {
  barcode?: string;
  brand?: string;
  businessId: string;
  categoryId: string;
  createdAt: Date;
  description?: string;
  hsnSac?: string;
  id: string;
  imageUrl?: string;
  isActive: boolean;
  lowStockLevel: number;
  name: string;
  openingStock: number;
  purchasePrice?: number;
  sellingPrice: number;
  sku: string;
  taxProfileId: string;
  tenantId: string;
  trackInventory: boolean;
  unitId: string;
  updatedAt: Date;
};

export type CreateCategoryInput = Pick<
  CategoryRecord,
  'businessId' | 'code' | 'isActive' | 'name' | 'tenantId'
>;

export type UpdateCategoryInput = Partial<Pick<CategoryRecord, 'code' | 'isActive' | 'name'>>;

export type CreateUnitInput = Pick<
  UnitRecord,
  'businessId' | 'code' | 'isActive' | 'name' | 'precision' | 'symbol' | 'tenantId'
>;

export type UpdateUnitInput = Partial<
  Pick<UnitRecord, 'code' | 'isActive' | 'name' | 'precision' | 'symbol'>
>;

export type CreateTaxProfileInput = Pick<
  TaxProfileRecord,
  'businessId' | 'code' | 'isActive' | 'name' | 'rateBasisPoints' | 'tenantId'
>;

export type UpdateTaxProfileInput = Partial<
  Pick<TaxProfileRecord, 'code' | 'isActive' | 'name' | 'rateBasisPoints'>
>;

export type CreateProductInput = Omit<ProductRecord, 'createdAt' | 'id' | 'updatedAt'>;

export type UpdateProductInput = Partial<
  Pick<
    ProductRecord,
    | 'barcode'
    | 'brand'
    | 'categoryId'
    | 'description'
    | 'hsnSac'
    | 'imageUrl'
    | 'isActive'
    | 'lowStockLevel'
    | 'name'
    | 'openingStock'
    | 'purchasePrice'
    | 'sellingPrice'
    | 'sku'
    | 'taxProfileId'
    | 'trackInventory'
    | 'unitId'
  >
>;

export type CatalogQuery = {
  businessId?: string;
};

export type ProductSearchQuery = CatalogQuery & {
  limit: number;
  query: string;
};

export type CategoryView = {
  businessCode: string;
  businessId: string;
  businessName: string;
  code: string;
  id: string;
  isActive: boolean;
  name: string;
};

export type UnitView = {
  businessCode: string;
  businessId: string;
  businessName: string;
  code: string;
  id: string;
  isActive: boolean;
  name: string;
  precision: number;
  symbol?: string;
};

export type TaxProfileView = {
  businessCode: string;
  businessId: string;
  businessName: string;
  code: string;
  id: string;
  isActive: boolean;
  name: string;
  rateBasisPoints: number;
};

export type ProductView = {
  barcode?: string;
  brand?: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  categoryCode: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  hsnSac?: string;
  id: string;
  imageUrl?: string;
  isActive: boolean;
  lowStockLevel: number;
  name: string;
  openingStock: number;
  purchasePrice?: number;
  sellingPrice: number;
  sku: string;
  taxProfileCode: string;
  taxProfileId: string;
  taxProfileName: string;
  taxRateBasisPoints: number;
  trackInventory: boolean;
  unitCode: string;
  unitId: string;
  unitName: string;
  unitPrecision: number;
  unitSymbol?: string;
};

export type ProductSearchView = {
  barcode?: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  id: string;
  name: string;
  sellingPrice: number;
  sku: string;
  trackInventory: boolean;
  unitCode: string;
  unitId: string;
  unitName: string;
  unitSymbol?: string;
};
