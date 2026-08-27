import type { BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type {
  CategoryRecord,
  CategoryView,
  TaxProfileRecord,
  TaxProfileView,
  UnitRecord,
  UnitView
} from './catalog.types.js';

export const toCategoryView = (
  category: CategoryRecord,
  business: BusinessRecord
): CategoryView => ({
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  code: category.code,
  id: category.id,
  isActive: category.isActive,
  name: category.name
});

export const toTaxProfileView = (
  taxProfile: TaxProfileRecord,
  business: BusinessRecord
): TaxProfileView => ({
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  code: taxProfile.code,
  id: taxProfile.id,
  isActive: taxProfile.isActive,
  name: taxProfile.name,
  rateBasisPoints: taxProfile.rateBasisPoints
});

export const toUnitView = (unit: UnitRecord, business: BusinessRecord): UnitView => ({
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  code: unit.code,
  id: unit.id,
  isActive: unit.isActive,
  name: unit.name,
  precision: unit.precision,
  symbol: unit.symbol
});
