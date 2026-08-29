export type ClientProductRecord = {
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
  updatedAt: Date;
};

export type ProductSearchInput = {
  businessId?: string;
  limit: number;
  query: string;
};

export interface ProductRepository {
  findById(productId: string): Promise<ClientProductRecord | null>;
  listByIds(productIds: string[]): Promise<ClientProductRecord[]>;
  search(input: ProductSearchInput): Promise<ClientProductRecord[]>;
  upsertProducts(products: ClientProductRecord[]): Promise<void>;
}
