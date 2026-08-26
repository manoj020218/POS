import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import type { SaleRepository } from './sale.repository.js';
import { ensureUniqueProducts } from './sale-shared.js';
import type { CreateSaleReturnRequest, SaleReturnView } from './sale.types.js';

export const createSaleReturnHandler =
  (repository: SaleRepository) =>
  async (
    context: AccessContext,
    saleId: string,
    input: CreateSaleReturnRequest
  ): Promise<SaleReturnView> => {
    const detail = await repository.findSaleDetailById(saleId, context.tenantId);
    if (!detail) {
      throw createHttpError(404, 'SALE_NOT_FOUND', 'Sale not found');
    }

    assertBranchAccess(context, detail.sale.branchId);
    ensureUniqueProducts(input.items.map((item) => item.productId), 'DUPLICATE_SALE_RETURN_PRODUCT');

    const soldItemsByProductId = new Map(
      detail.items.map((item) => [
        item.productId,
        {
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity
        }
      ] as const)
    );
    const saleQuantities = await repository.listSaleMovementQuantities(
      saleId,
      context.tenantId,
      'SALE'
    );
    const returnQuantities = await repository.listSaleMovementQuantities(
      saleId,
      context.tenantId,
      'SALE_RETURN'
    );
    const trackedSoldQuantities = new Map(
      saleQuantities.map((item) => [item.productId, Math.abs(item.quantity)] as const)
    );
    const returnedQuantities = new Map(
      returnQuantities.map((item) => [item.productId, item.quantity] as const)
    );
    const occurredAt = input.occurredAt ?? new Date();

    input.items.forEach((item) => {
      const soldItem = soldItemsByProductId.get(item.productId);
      if (!soldItem) {
        throw createHttpError(404, 'SALE_ITEM_NOT_FOUND', 'Sale item not found');
      }

      const trackedSoldQuantity = trackedSoldQuantities.get(item.productId);
      if (!trackedSoldQuantity) {
        throw createHttpError(
          409,
          'SALE_ITEM_NOT_TRACKED',
          'Sale item does not create inventory movements'
        );
      }

      const alreadyReturned = returnedQuantities.get(item.productId) ?? 0;
      if (alreadyReturned + item.quantity > trackedSoldQuantity) {
        throw createHttpError(
          409,
          'RETURN_QUANTITY_EXCEEDS_SOLD',
          'Return quantity exceeds the remaining sold quantity'
        );
      }
    });

    await repository.createSaleReturn({
      inventoryMovements: input.items.map((item) => ({
        branchId: detail.sale.branchId,
        businessId: detail.sale.businessId,
        movementType: 'SALE_RETURN' as const,
        occurredAt,
        productId: item.productId,
        quantityDelta: item.quantity,
        tenantId: context.tenantId
      })),
      saleId,
      tenantId: context.tenantId
    });

    return {
      branchId: detail.sale.branchId,
      businessId: detail.sale.businessId,
      items: input.items.map((item) => {
        const soldItem = soldItemsByProductId.get(item.productId)!;
        const returnedQuantityTotal = (returnedQuantities.get(item.productId) ?? 0) + item.quantity;
        return {
          productId: item.productId,
          productName: soldItem.productName,
          productSku: soldItem.productSku,
          quantity: item.quantity,
          remainingQuantity: soldItem.quantity - returnedQuantityTotal,
          returnedQuantityTotal
        };
      }),
      occurredAt,
      saleId
    };
  };
