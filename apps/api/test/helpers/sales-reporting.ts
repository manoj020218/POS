import type { DrizzleCatalogRepository } from '../../src/modules/catalog/drizzle-catalog.repository.js';
import type { DrizzleSaleRepository } from '../../src/modules/sale/drizzle-sale.repository.js';
import type { PaymentMethod } from '../../src/modules/sale/sale.types.js';

export const createMasters = async (
  repository: DrizzleCatalogRepository,
  tenantId: string,
  businessId: string
) => {
  const category = await repository.createCategory({
    businessId,
    code: 'GENERAL',
    isActive: true,
    name: 'General',
    tenantId
  });
  const unit = await repository.createUnit({
    businessId,
    code: 'PCS',
    isActive: true,
    name: 'Pieces',
    precision: 0,
    tenantId
  });
  const taxProfile = await repository.createTaxProfile({
    businessId,
    code: 'GST-0',
    isActive: true,
    name: 'No Tax',
    rateBasisPoints: 0,
    tenantId
  });

  return { categoryId: category.id, taxProfileId: taxProfile.id, unitId: unit.id };
};

export const createRepositorySale = (
  repository: DrizzleSaleRepository,
  input: {
    branchCode: string;
    branchId: string;
    businessId: string;
    cashierUserId: string;
    items: Array<{
      discountAmount?: number;
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      taxAmount?: number;
      unitPrice: number;
    }>;
    occurredAt: string;
    paymentMethod?: PaymentMethod;
    tenantId: string;
    terminalCode: string;
    terminalId: string;
  }
) =>
  repository.createSale({
    items: input.items.map((item) => ({
      discountAmount: item.discountAmount ?? 0,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      saleId: '',
      subtotalAmount: item.unitPrice * item.quantity,
      taxAmount: item.taxAmount ?? 0,
      tenantId: input.tenantId,
      totalAmount:
        item.unitPrice * item.quantity - (item.discountAmount ?? 0) + (item.taxAmount ?? 0),
      unitPrice: item.unitPrice
    })),
    inventoryMovements: input.items.map((item) => ({
      branchId: input.branchId,
      businessId: input.businessId,
      movementType: 'SALE' as const,
      occurredAt: new Date(input.occurredAt),
      productId: item.productId,
      quantityDelta: -item.quantity,
      tenantId: input.tenantId
    })),
    sale: {
      branchCode: input.branchCode,
      branchId: input.branchId,
      businessId: input.businessId,
      cashierUserId: input.cashierUserId,
      changeAmount: 0,
      discountAmount: input.items.reduce((sum, item) => sum + (item.discountAmount ?? 0), 0),
      occurredAt: new Date(input.occurredAt),
      paymentMethod: input.paymentMethod ?? 'CARD',
      subtotalAmount: input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      taxAmount: input.items.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0),
      tenderedAmount: input.items.reduce(
        (sum, item) =>
          sum +
          (item.unitPrice * item.quantity - (item.discountAmount ?? 0) + (item.taxAmount ?? 0)),
        0
      ),
      tenantId: input.tenantId,
      terminalCode: input.terminalCode,
      terminalId: input.terminalId,
      totalAmount: input.items.reduce(
        (sum, item) =>
          sum +
          (item.unitPrice * item.quantity - (item.discountAmount ?? 0) + (item.taxAmount ?? 0)),
        0
      )
    }
  });
