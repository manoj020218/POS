import { randomUUID } from 'node:crypto';

import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { products } from '../../db/schema/index.js';
import { createHttpError } from '../../lib/http-error.js';
import {
  isDuplicateKeyError,
  normalizeProduct
} from './drizzle-catalog.repository.utils.js';
import { rankProductsForSearch } from './product-search-ranking.js';
import type {
  CreateProductInput,
  ProductRecord,
  UpdateProductInput
} from './catalog.types.js';

export const createDrizzleCatalogProductStore = (db: AppDatabase) => ({
  async createProduct(input: CreateProductInput): Promise<ProductRecord> {
    try {
      const [record] = await db
        .insert(products)
        .values({ id: randomUUID(), ...input })
        .returning();
      return normalizeProduct(requireRow(record, 'PRODUCT_NOT_FOUND', 'Product not found'));
    } catch (error) {
      throwIdentifierConflict(error);
      throw error;
    }
  },

  async findProductById(productId: string) {
    const [record] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    return record ? normalizeProduct(record) : null;
  },

  async findProductBySkuOrBarcode(
    tenantId: string,
    businessId: string,
    input: { barcode?: string; sku?: string }
  ) {
    const identifiers = [
      input.barcode ? eq(products.barcode, input.barcode) : null,
      input.sku ? eq(products.sku, input.sku) : null
    ].filter(Boolean);
    if (identifiers.length === 0) return null;

    const [record] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.businessId, businessId),
          identifiers.length === 1 ? identifiers[0]! : or(identifiers[0]!, identifiers[1]!)
        )
      )
      .limit(1);
    return record ? normalizeProduct(record) : null;
  },

  async listProducts(tenantId: string, businessIds?: string[]) {
    const whereClause =
      !businessIds || businessIds.length === 0
        ? eq(products.tenantId, tenantId)
        : and(eq(products.tenantId, tenantId), inArray(products.businessId, businessIds));
    const records = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(asc(products.name), asc(products.sku));
    return records.map(normalizeProduct);
  },

  async searchProducts(tenantId: string, businessIds: string[], query: string, limit: number) {
    const exactBarcodeMatches = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          inArray(products.businessId, businessIds),
          eq(products.isActive, true),
          eq(products.barcode, query.trim())
        )
      )
      .orderBy(asc(products.name), asc(products.sku));
    if (exactBarcodeMatches.length > 0) {
      return exactBarcodeMatches.map(normalizeProduct).slice(0, limit);
    }

    const pattern = `%${query.trim()}%`;
    const records = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          inArray(products.businessId, businessIds),
          eq(products.isActive, true),
          or(
            ilike(products.name, pattern),
            ilike(products.sku, pattern),
            ilike(products.barcode, pattern)
          )
        )
      )
      .orderBy(asc(products.name), asc(products.sku));
    return rankProductsForSearch(records.map(normalizeProduct), query).slice(0, limit);
  },

  async updateProduct(productId: string, tenantId: string, input: UpdateProductInput) {
    try {
      const [record] = await db
        .update(products)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
        .returning();
      return record ? normalizeProduct(record) : null;
    } catch (error) {
      throwIdentifierConflict(error);
      throw error;
    }
  }
});

const requireRow = <T>(row: T | undefined, code: string, message: string) => {
  if (!row) throw createHttpError(404, code, message);
  return row;
};

const throwIdentifierConflict = (error: unknown) => {
  if (isDuplicateKeyError(error)) {
    throw createHttpError(409, 'PRODUCT_IDENTIFIER_IN_USE', 'Product identifier already in use');
  }
};
