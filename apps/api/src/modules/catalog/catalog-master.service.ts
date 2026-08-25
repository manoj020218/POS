import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { BusinessRecord } from '../tenant-core/tenant-core.types.js';
import { generateScopedCode } from './catalog-defaults.js';
import { resolveReadBusinessIds, resolveWriteBusiness } from './catalog-business-scope.js';
import type { CatalogRepository } from './catalog.repository.js';
import type {
  CatalogQuery,
  CategoryRecord,
  CategoryView,
  TaxProfileRecord,
  TaxProfileView,
  UnitRecord,
  UnitView
} from './catalog.types.js';

type CreateCategoryInput = Pick<AccessContext, 'tenantId' | 'userId'> & {
  businessId?: string;
  code?: string;
  isActive: boolean;
  name: string;
};

type CreateUnitInput = CreateCategoryInput & {
  precision: number;
  symbol?: string;
};

type CreateTaxProfileInput = CreateCategoryInput & {
  rateBasisPoints: number;
};

export const createCatalogMasterHandlers = (
  repository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  createCategory: async (
    context: AccessContext,
    input: Omit<CreateCategoryInput, 'tenantId' | 'userId'>
  ): Promise<CategoryView> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
    const code = await resolveCategoryCode(repository, context.tenantId, business.id, input.code, input.name);
    const category = await repository.createCategory({ ...input, businessId: business.id, code, tenantId: context.tenantId });
    return toCategoryView(category, business);
  },
  createTaxProfile: async (
    context: AccessContext,
    input: Omit<CreateTaxProfileInput, 'tenantId' | 'userId'>
  ): Promise<TaxProfileView> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
    const code = await resolveTaxProfileCode(repository, context.tenantId, business.id, input.code, input.name);
    const taxProfile = await repository.createTaxProfile({ ...input, businessId: business.id, code, tenantId: context.tenantId });
    return toTaxProfileView(taxProfile, business);
  },
  createUnit: async (
    context: AccessContext,
    input: Omit<CreateUnitInput, 'tenantId' | 'userId'>
  ): Promise<UnitView> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
    const code = await resolveUnitCode(repository, context.tenantId, business.id, input.code, input.name);
    const unit = await repository.createUnit({ ...input, businessId: business.id, code, tenantId: context.tenantId });
    return toUnitView(unit, business);
  },
  listCategories: async (context: AccessContext, query: CatalogQuery): Promise<CategoryView[]> => {
    const businesses = await resolveBusinessesForRead(context, tenantCoreRepository, query.businessId);
    if (businesses.length === 0) return [];
    const categoryRecords = await repository.listCategories(context.tenantId, businesses.map((business) => business.id));
    return categoryRecords.map((category) => toCategoryView(category, businessById(businesses, category.businessId)));
  },
  listTaxProfiles: async (context: AccessContext, query: CatalogQuery): Promise<TaxProfileView[]> => {
    const businesses = await resolveBusinessesForRead(context, tenantCoreRepository, query.businessId);
    if (businesses.length === 0) return [];
    const taxProfiles = await repository.listTaxProfiles(context.tenantId, businesses.map((business) => business.id));
    return taxProfiles.map((taxProfile) => toTaxProfileView(taxProfile, businessById(businesses, taxProfile.businessId)));
  },
  listUnits: async (context: AccessContext, query: CatalogQuery): Promise<UnitView[]> => {
    const businesses = await resolveBusinessesForRead(context, tenantCoreRepository, query.businessId);
    if (businesses.length === 0) return [];
    const unitRecords = await repository.listUnits(context.tenantId, businesses.map((business) => business.id));
    return unitRecords.map((unit) => toUnitView(unit, businessById(businesses, unit.businessId)));
  },
  updateCategory: async (context: AccessContext, categoryId: string, input: Partial<Pick<CategoryRecord, 'code' | 'isActive' | 'name'>>): Promise<CategoryView> => {
    const existing = await repository.findCategoryById(categoryId);
    const business = await assertMasterAccess(context, tenantCoreRepository, existing?.businessId);
    const code = input.code ? await resolveCategoryCode(repository, context.tenantId, existing!.businessId, input.code, input.name ?? existing!.name, existing!.id) : undefined;
    const updated = await repository.updateCategory(categoryId, context.tenantId, { ...input, ...(code ? { code } : {}) });
    if (!updated) throw createHttpError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    return toCategoryView(updated, business);
  },
  updateTaxProfile: async (context: AccessContext, taxProfileId: string, input: Partial<Pick<TaxProfileRecord, 'code' | 'isActive' | 'name' | 'rateBasisPoints'>>): Promise<TaxProfileView> => {
    const existing = await repository.findTaxProfileById(taxProfileId);
    const business = await assertMasterAccess(context, tenantCoreRepository, existing?.businessId);
    const code = input.code ? await resolveTaxProfileCode(repository, context.tenantId, existing!.businessId, input.code, input.name ?? existing!.name, existing!.id) : undefined;
    const updated = await repository.updateTaxProfile(taxProfileId, context.tenantId, { ...input, ...(code ? { code } : {}) });
    if (!updated) throw createHttpError(404, 'TAX_PROFILE_NOT_FOUND', 'Tax profile not found');
    return toTaxProfileView(updated, business);
  },
  updateUnit: async (context: AccessContext, unitId: string, input: Partial<Pick<UnitRecord, 'code' | 'isActive' | 'name' | 'precision' | 'symbol'>>): Promise<UnitView> => {
    const existing = await repository.findUnitById(unitId);
    const business = await assertMasterAccess(context, tenantCoreRepository, existing?.businessId);
    const code = input.code ? await resolveUnitCode(repository, context.tenantId, existing!.businessId, input.code, input.name ?? existing!.name, existing!.id) : undefined;
    const updated = await repository.updateUnit(unitId, context.tenantId, { ...input, ...(code ? { code } : {}) });
    if (!updated) throw createHttpError(404, 'UNIT_NOT_FOUND', 'Unit not found');
    return toUnitView(updated, business);
  }
});

const resolveBusinessesForRead = async (context: AccessContext, repository: TenantCoreRepository, businessId?: string) => {
  const businessIds = await resolveReadBusinessIds(context, repository, businessId);
  const businesses = await repository.listBusinesses(context.tenantId);
  return businesses.filter((business) => businessIds.includes(business.id));
};

const assertMasterAccess = async (context: AccessContext, repository: TenantCoreRepository, businessId?: string) => {
  if (!businessId) throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
  return resolveWriteBusiness(context, repository, businessId);
};

const resolveCategoryCode = async (repository: CatalogRepository, tenantId: string, businessId: string, code: string | undefined, name: string, currentId?: string) =>
  resolveScopedCode(code, name, (value) => repository.findCategoryByCode(tenantId, businessId, value), currentId);
const resolveTaxProfileCode = async (repository: CatalogRepository, tenantId: string, businessId: string, code: string | undefined, name: string, currentId?: string) =>
  resolveScopedCode(code, name, (value) => repository.findTaxProfileByCode(tenantId, businessId, value), currentId);
const resolveUnitCode = async (repository: CatalogRepository, tenantId: string, businessId: string, code: string | undefined, name: string, currentId?: string) =>
  resolveScopedCode(code, name, (value) => repository.findUnitByCode(tenantId, businessId, value), currentId);

const resolveScopedCode = async <T extends { id: string }>(code: string | undefined, name: string, findByCode: (value: string) => Promise<T | null>, currentId?: string) => {
  if (code) {
    const existing = await findByCode(code);
    if (existing && existing.id !== currentId) throw createHttpError(409, 'DUPLICATE_CODE', `Code ${code} already exists`);
    return code;
  }
  for (let suffix = 0; suffix < 200; suffix += 1) {
    const candidate = generateScopedCode(name, suffix);
    const existing = await findByCode(candidate);
    if (!existing || existing.id === currentId) return candidate;
  }
  throw createHttpError(409, 'DUPLICATE_CODE', 'Unable to generate a unique code');
};

const businessById = (businesses: BusinessRecord[], businessId: string) => {
  const business = businesses.find((item) => item.id === businessId);
  if (!business) throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
  return business;
};

const toCategoryView = (category: CategoryRecord, business: BusinessRecord): CategoryView => ({
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  code: category.code,
  id: category.id,
  isActive: category.isActive,
  name: category.name
});

const toTaxProfileView = (taxProfile: TaxProfileRecord, business: BusinessRecord): TaxProfileView => ({
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  code: taxProfile.code,
  id: taxProfile.id,
  isActive: taxProfile.isActive,
  name: taxProfile.name,
  rateBasisPoints: taxProfile.rateBasisPoints
});

const toUnitView = (unit: UnitRecord, business: BusinessRecord): UnitView => ({
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
