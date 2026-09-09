import { createHttpError } from '../../lib/http-error.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { CreateKioskOrderItemInput, KioskOrderLineSnapshot } from './kiosk.types.js';

export const resolveKioskOrderItems = async (
  catalogRepository: CatalogRepository,
  businessId: string,
  items: CreateKioskOrderItemInput[]
): Promise<{ items: KioskOrderLineSnapshot[]; totalAmount: number }> => {
  const productIds = new Set(items.map((item) => item.productId));
  if (productIds.size !== items.length) {
    throw createHttpError(400, 'DUPLICATE_PRODUCT', 'Each product may only appear once per order');
  }

  const resolved = await Promise.all(
    items.map(async (item) => {
      const product = await catalogRepository.findProductById(item.productId);
      if (!product || product.businessId !== businessId) {
        throw createHttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      }
      if (!product.isActive) {
        throw createHttpError(409, 'PRODUCT_INACTIVE', 'Product is inactive');
      }

      const lineTotal = product.sellingPrice * item.quantity;
      return {
        lineTotal,
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.sellingPrice
      };
    })
  );

  const totalAmount = resolved.reduce((sum, line) => sum + line.lineTotal, 0);
  return { items: resolved, totalAmount };
};
