import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, gt, ilike, inArray, or, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { productPriceChanges, productVariants, products } from '../../db/schema/index.js';
import { createHttpError } from '../../lib/http-error.js';
import { buildPaginationMeta } from './catalog-pagination.js';
import {
  isDuplicateKeyError,
  normalizeProduct,
  normalizeProductPriceChange,
  normalizeProductVariant
} from './drizzle-catalog.repository.utils.js';
import { rankProductsForSearch } from './product-search-ranking.js';
import type {
  CatalogUpdatedSinceInput,
  CreateProductInput,
  PaginatedResult,
  PaginationInput,
  ProductRecord,
  ProductVariantInput,
  RecordProductPriceChangeInput,
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

  async listProducts(
    tenantId: string,
    businessIds: string[] | undefined,
    pagination: PaginationInput
  ): Promise<PaginatedResult<ProductRecord>> {
    const whereClause =
      !businessIds || businessIds.length === 0
        ? eq(products.tenantId, tenantId)
        : and(eq(products.tenantId, tenantId), inArray(products.businessId, businessIds));
    const [countRow] = await db
      .select({ totalItems: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);
    const totalItems = Number(countRow?.totalItems ?? 0);
    const records = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(asc(products.name), asc(products.sku), asc(products.id))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);
    return {
      items: records.map(normalizeProduct),
      meta: buildPaginationMeta({
        ...pagination,
        totalItems
      })
    };
  },

  async listProductsUpdatedSince(
    tenantId: string,
    businessIds: string[],
    input: CatalogUpdatedSinceInput
  ) {
    if (businessIds.length === 0) {
      return [];
    }

    const baseWhere = and(eq(products.tenantId, tenantId), inArray(products.businessId, businessIds));
    const whereClause = !input.cursor
      ? baseWhere
      : and(
          baseWhere,
          or(
            gt(products.updatedAt, input.cursor.updatedAt),
            and(
              eq(products.updatedAt, input.cursor.updatedAt),
              sql<boolean>`concat('product:', ${products.id}) > ${input.cursor.changeKey}`
            )
          )
        );
    const records = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(asc(products.updatedAt), asc(products.id))
      .limit(input.limit);

    return records.map(normalizeProduct);
  },

  async listInventoryProducts(tenantId: string, businessIds: string[], productId?: string) {
    if (businessIds.length === 0) {
      return [];
    }

    const filters = [
      eq(products.tenantId, tenantId),
      inArray(products.businessId, businessIds),
      eq(products.trackInventory, true),
      productId ? eq(products.id, productId) : null
    ].filter(Boolean);
    const records = await db
      .select()
      .from(products)
      .where(and(filters[0]!, filters[1]!, filters[2]!, ...(filters.slice(3) as [])))
      .orderBy(asc(products.name), asc(products.sku), asc(products.id));
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

  async listRecentPriceChanges(tenantId: string, productId: string, limit: number) {
    const records = await db
      .select()
      .from(productPriceChanges)
      .where(
        and(eq(productPriceChanges.tenantId, tenantId), eq(productPriceChanges.productId, productId))
      )
      .orderBy(desc(productPriceChanges.changedAt))
      .limit(limit);
    return records.map(normalizeProductPriceChange);
  },

  async recordProductPriceChange(input: RecordProductPriceChangeInput, keepLatest: number) {
    const [record] = await db
      .insert(productPriceChanges)
      .values({ id: randomUUID(), ...input })
      .returning();
    const inserted = normalizeProductPriceChange(
      requireRow(record, 'PRODUCT_PRICE_CHANGE_NOT_FOUND', 'Price change not found')
    );

    const stale = await db
      .select({ id: productPriceChanges.id })
      .from(productPriceChanges)
      .where(
        and(
          eq(productPriceChanges.tenantId, input.tenantId),
          eq(productPriceChanges.productId, input.productId)
        )
      )
      .orderBy(desc(productPriceChanges.changedAt))
      .offset(keepLatest);
    if (stale.length > 0) {
      await db.delete(productPriceChanges).where(
        inArray(
          productPriceChanges.id,
          stale.map((row) => row.id)
        )
      );
    }

    return inserted;
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
  },

  async listVariantsForProducts(tenantId: string, productIds: string[]) {
    if (productIds.length === 0) return [];
    const rows = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.tenantId, tenantId), inArray(productVariants.productId, productIds)))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));
    return rows.map(normalizeProductVariant);
  },

  async replaceProductVariants(
    tenantId: string,
    businessId: string,
    productId: string,
    variants: ProductVariantInput[]
  ) {
    return db.transaction(async (tx) => {
      await tx
        .delete(productVariants)
        .where(and(eq(productVariants.tenantId, tenantId), eq(productVariants.productId, productId)));

      if (variants.length === 0) return [];

      const rows = await tx
        .insert(productVariants)
        .values(
          variants.map((variant, index) => ({
            businessId,
            id: randomUUID(),
            name: variant.name,
            productId,
            sellingPrice: variant.sellingPrice,
            sortOrder: index,
            tenantId
          }))
        )
        .returning();
      return rows.map(normalizeProductVariant);
    });
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
