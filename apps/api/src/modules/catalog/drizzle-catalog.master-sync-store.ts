import { and, asc, eq, gt, inArray, or, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { categories, taxProfiles, units } from '../../db/schema/index.js';
import {
  normalizeCategory,
  normalizeTaxProfile,
  normalizeUnit
} from './drizzle-catalog.repository.utils.js';
import type {
  CatalogUpdatedSinceInput,
  CategoryRecord,
  TaxProfileRecord,
  UnitRecord
} from './catalog.types.js';

export const createDrizzleCatalogMasterSyncStore = (db: AppDatabase) => ({
  async listCategoriesUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: CatalogUpdatedSinceInput
  ): Promise<CategoryRecord[]> {
    const whereClause = buildUpdatedSinceWhereClause(
      categories,
      'category:',
      tenantId,
      businessIds,
      input
    );
    if (!whereClause) {
      return [];
    }

    const records = await db
      .select()
      .from(categories)
      .where(whereClause)
      .orderBy(asc(categories.updatedAt), asc(categories.id))
      .limit(input.limit);
    return records.map(normalizeCategory);
  },

  async listTaxProfilesUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: CatalogUpdatedSinceInput
  ): Promise<TaxProfileRecord[]> {
    const whereClause = buildUpdatedSinceWhereClause(
      taxProfiles,
      'tax-profile:',
      tenantId,
      businessIds,
      input
    );
    if (!whereClause) {
      return [];
    }

    const records = await db
      .select()
      .from(taxProfiles)
      .where(whereClause)
      .orderBy(asc(taxProfiles.updatedAt), asc(taxProfiles.id))
      .limit(input.limit);
    return records.map(normalizeTaxProfile);
  },

  async listUnitsUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: CatalogUpdatedSinceInput
  ): Promise<UnitRecord[]> {
    const whereClause = buildUpdatedSinceWhereClause(units, 'unit:', tenantId, businessIds, input);
    if (!whereClause) {
      return [];
    }

    const records = await db
      .select()
      .from(units)
      .where(whereClause)
      .orderBy(asc(units.updatedAt), asc(units.id))
      .limit(input.limit);
    return records.map(normalizeUnit);
  }
});

const buildUpdatedSinceWhereClause = (
  table: typeof categories | typeof taxProfiles | typeof units,
  changeKeyPrefix: string,
  tenantId: string,
  businessIds: string[],
  input: CatalogUpdatedSinceInput
) => {
  if (businessIds.length === 0) {
    return null;
  }

  const baseWhere = and(eq(table.tenantId, tenantId), inArray(table.businessId, businessIds));
  const prefixLiteral = sql.raw(`'${changeKeyPrefix}'`);
  if (!input.cursor) {
    return baseWhere;
  }

  return and(
    baseWhere,
    or(
      gt(table.updatedAt, input.cursor.updatedAt),
      and(
        eq(table.updatedAt, input.cursor.updatedAt),
        sql<boolean>`concat(${prefixLiteral}, ${table.id}) > ${input.cursor.changeKey}`
      )
    )
  );
};
