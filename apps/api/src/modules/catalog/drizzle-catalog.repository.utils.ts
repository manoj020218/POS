import { categories, products, taxProfiles, units } from '../../db/schema/index.js';
import type {
  CategoryRecord,
  ProductRecord,
  TaxProfileRecord,
  UnitRecord
} from './catalog.types.js';

const DUPLICATE_KEY = '23505';

export const normalizeCategory = (record: typeof categories.$inferSelect): CategoryRecord => ({
  businessId: record.businessId,
  code: record.code,
  createdAt: record.createdAt,
  id: record.id,
  isActive: record.isActive,
  name: record.name,
  tenantId: record.tenantId,
  updatedAt: record.updatedAt
});

export const normalizeUnit = (record: typeof units.$inferSelect): UnitRecord => ({
  businessId: record.businessId,
  code: record.code,
  createdAt: record.createdAt,
  id: record.id,
  isActive: record.isActive,
  name: record.name,
  precision: record.precision,
  symbol: record.symbol ?? undefined,
  tenantId: record.tenantId,
  updatedAt: record.updatedAt
});

export const normalizeTaxProfile = (
  record: typeof taxProfiles.$inferSelect
): TaxProfileRecord => ({
  businessId: record.businessId,
  code: record.code,
  createdAt: record.createdAt,
  id: record.id,
  isActive: record.isActive,
  name: record.name,
  rateBasisPoints: record.rateBasisPoints,
  tenantId: record.tenantId,
  updatedAt: record.updatedAt
});

export const normalizeProduct = (record: typeof products.$inferSelect): ProductRecord => ({
  barcode: record.barcode ?? undefined,
  brand: record.brand ?? undefined,
  businessId: record.businessId,
  categoryId: record.categoryId,
  createdAt: record.createdAt,
  description: record.description ?? undefined,
  hsnSac: record.hsnSac ?? undefined,
  id: record.id,
  imageUrl: record.imageUrl ?? undefined,
  isActive: record.isActive,
  lowStockLevel: record.lowStockLevel,
  name: record.name,
  openingStock: record.openingStock,
  purchasePrice: record.purchasePrice ?? undefined,
  sellingPrice: record.sellingPrice,
  sku: record.sku,
  taxProfileId: record.taxProfileId,
  tenantId: record.tenantId,
  trackInventory: record.trackInventory,
  unitId: record.unitId,
  updatedAt: record.updatedAt
});

export const isDuplicateKeyError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === DUPLICATE_KEY) return true;
  if ('cause' in error && typeof error.cause === 'object' && error.cause !== null) {
    return 'code' in error.cause && error.cause.code === DUPLICATE_KEY;
  }

  return false;
};
