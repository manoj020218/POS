import { randomUUID } from 'node:crypto';

import { and, asc, eq, inArray } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { categories, taxProfiles, units } from '../../db/schema/index.js';
import { createHttpError } from '../../lib/http-error.js';
import { isDuplicateKeyError, normalizeCategory, normalizeTaxProfile, normalizeUnit } from './drizzle-catalog.repository.utils.js';
import type { CategoryRecord, CreateCategoryInput, CreateTaxProfileInput, CreateUnitInput, TaxProfileRecord, UnitRecord, UpdateCategoryInput, UpdateTaxProfileInput, UpdateUnitInput } from './catalog.types.js';

export const createDrizzleCatalogMasterStore = (db: AppDatabase) => ({
  async createCategory(input: CreateCategoryInput): Promise<CategoryRecord> {
    try {
      const [record] = await db
        .insert(categories)
        .values({ id: randomUUID(), ...input })
        .returning();
      return normalizeCategory(requireRow(record, 'CATEGORY_NOT_FOUND', 'Category not found'));
    } catch (error) {
      throwDuplicate(error, input.code);
      throw error;
    }
  },
  async createTaxProfile(input: CreateTaxProfileInput): Promise<TaxProfileRecord> {
    try {
      const [record] = await db
        .insert(taxProfiles)
        .values({ id: randomUUID(), ...input })
        .returning();
      return normalizeTaxProfile(
        requireRow(record, 'TAX_PROFILE_NOT_FOUND', 'Tax profile not found')
      );
    } catch (error) {
      throwDuplicate(error, input.code);
      throw error;
    }
  },
  async createUnit(input: CreateUnitInput): Promise<UnitRecord> {
    try {
      const [record] = await db.insert(units).values({ id: randomUUID(), ...input }).returning();
      return normalizeUnit(requireRow(record, 'UNIT_NOT_FOUND', 'Unit not found'));
    } catch (error) {
      throwDuplicate(error, input.code);
      throw error;
    }
  },
  async findCategoryByCode(tenantId: string, businessId: string, code: string) {
    const [record] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.businessId, businessId), eq(categories.code, code)))
      .limit(1);
    return record ? normalizeCategory(record) : null;
  },
  async findCategoryById(categoryId: string) {
    const [record] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    return record ? normalizeCategory(record) : null;
  },
  async findTaxProfileByCode(tenantId: string, businessId: string, code: string) {
    const [record] = await db
      .select()
      .from(taxProfiles)
      .where(and(eq(taxProfiles.tenantId, tenantId), eq(taxProfiles.businessId, businessId), eq(taxProfiles.code, code)))
      .limit(1);
    return record ? normalizeTaxProfile(record) : null;
  },
  async findTaxProfileById(taxProfileId: string) {
    const [record] = await db
      .select()
      .from(taxProfiles)
      .where(eq(taxProfiles.id, taxProfileId))
      .limit(1);
    return record ? normalizeTaxProfile(record) : null;
  },
  async findUnitByCode(tenantId: string, businessId: string, code: string) {
    const [record] = await db
      .select()
      .from(units)
      .where(and(eq(units.tenantId, tenantId), eq(units.businessId, businessId), eq(units.code, code)))
      .limit(1);
    return record ? normalizeUnit(record) : null;
  },
  async findUnitById(unitId: string) {
    const [record] = await db.select().from(units).where(eq(units.id, unitId)).limit(1);
    return record ? normalizeUnit(record) : null;
  },
  async listCategories(tenantId: string, businessIds?: string[]) {
    const records = await db
      .select()
      .from(categories)
      .where(byBusinessScope(categories, tenantId, businessIds))
      .orderBy(asc(categories.code), asc(categories.name));
    return records.map(normalizeCategory);
  },
  async listTaxProfiles(tenantId: string, businessIds?: string[]) {
    const records = await db
      .select()
      .from(taxProfiles)
      .where(byBusinessScope(taxProfiles, tenantId, businessIds))
      .orderBy(asc(taxProfiles.code), asc(taxProfiles.name));
    return records.map(normalizeTaxProfile);
  },
  async listUnits(tenantId: string, businessIds?: string[]) {
    const records = await db
      .select()
      .from(units)
      .where(byBusinessScope(units, tenantId, businessIds))
      .orderBy(asc(units.code), asc(units.name));
    return records.map(normalizeUnit);
  },
  async updateCategory(categoryId: string, tenantId: string, input: UpdateCategoryInput) {
    return updateCategoryRecord(db, categoryId, tenantId, input);
  },
  async updateTaxProfile(taxProfileId: string, tenantId: string, input: UpdateTaxProfileInput) {
    return updateTaxProfileRecord(db, taxProfileId, tenantId, input);
  },

  async updateUnit(unitId: string, tenantId: string, input: UpdateUnitInput) {
    return updateUnitRecord(db, unitId, tenantId, input);
  }
});

const byBusinessScope = (
  table: typeof categories | typeof taxProfiles | typeof units,
  tenantId: string,
  businessIds?: string[]
) => {
  if (!businessIds || businessIds.length === 0) return eq(table.tenantId, tenantId);
  return and(eq(table.tenantId, tenantId), inArray(table.businessId, businessIds));
};

const requireRow = <T>(row: T | undefined, code: string, message: string) => {
  if (!row) throw createHttpError(404, code, message);
  return row;
};

const throwDuplicate = (error: unknown, code: string) => {
  if (isDuplicateKeyError(error)) {
    throw createHttpError(409, 'DUPLICATE_CODE', `Code ${code} already exists`);
  }
};

const updateCategoryRecord = async (
  db: AppDatabase,
  categoryId: string,
  tenantId: string,
  input: UpdateCategoryInput
) => {
  try {
    const [record] = await db
      .update(categories)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(categories.id, categoryId), eq(categories.tenantId, tenantId)))
      .returning();
    return record ? normalizeCategory(record) : null;
  } catch (error) {
    if (input.code) throwDuplicate(error, input.code);
    throw error;
  }
};

const updateTaxProfileRecord = async (
  db: AppDatabase,
  taxProfileId: string,
  tenantId: string,
  input: UpdateTaxProfileInput
) => {
  try {
    const [record] = await db
      .update(taxProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(taxProfiles.id, taxProfileId), eq(taxProfiles.tenantId, tenantId)))
      .returning();
    return record ? normalizeTaxProfile(record) : null;
  } catch (error) {
    if (input.code) throwDuplicate(error, input.code);
    throw error;
  }
};

const updateUnitRecord = async (
  db: AppDatabase,
  unitId: string,
  tenantId: string,
  input: UpdateUnitInput
) => {
  try {
    const [record] = await db
      .update(units)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(units.id, unitId), eq(units.tenantId, tenantId)))
      .returning();
    return record ? normalizeUnit(record) : null;
  } catch (error) {
    if (input.code) throwDuplicate(error, input.code);
    throw error;
  }
};
