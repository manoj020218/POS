import { createHttpError } from '../../lib/http-error.js';
import type { BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type {
  CategoryRecord,
  ProductRecord,
  ProductSearchView,
  ProductView,
  TaxProfileRecord,
  UnitRecord
} from './catalog.types.js';

export const requiredRecord = <T>(
  map: Map<string, T>,
  id: string,
  code: string,
  message: string
) => {
  const record = map.get(id);
  if (!record) throw createHttpError(404, code, message);
  return record;
};

export const toProductSearchView = (
  product: ProductRecord,
  business: BusinessRecord,
  unit: UnitRecord
): ProductSearchView => ({
  barcode: product.barcode,
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  id: product.id,
  name: product.name,
  sellingPrice: product.sellingPrice,
  sku: product.sku,
  trackInventory: product.trackInventory,
  unitCode: unit.code,
  unitId: unit.id,
  unitName: unit.name,
  unitSymbol: unit.symbol
});

export const toProductView = (
  product: ProductRecord,
  business: BusinessRecord,
  category: CategoryRecord,
  unit: UnitRecord,
  taxProfile: TaxProfileRecord
): ProductView => ({
  barcode: product.barcode,
  brand: product.brand,
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  categoryCode: category.code,
  categoryId: category.id,
  categoryName: category.name,
  description: product.description,
  hsnSac: product.hsnSac,
  id: product.id,
  imageUrl: product.imageUrl,
  isActive: product.isActive,
  lowStockLevel: product.lowStockLevel,
  name: product.name,
  openingStock: product.openingStock,
  purchasePrice: product.purchasePrice,
  sellingPrice: product.sellingPrice,
  sku: product.sku,
  taxProfileCode: taxProfile.code,
  taxProfileId: taxProfile.id,
  taxProfileName: taxProfile.name,
  taxRateBasisPoints: taxProfile.rateBasisPoints,
  trackInventory: product.trackInventory,
  unitCode: unit.code,
  unitId: unit.id,
  unitName: unit.name,
  unitPrecision: unit.precision,
  unitSymbol: unit.symbol
});
