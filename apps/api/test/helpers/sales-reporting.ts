import type { DrizzleCatalogRepository } from '../../src/modules/catalog/drizzle-catalog.repository.js';
import type { DrizzleSaleRepository } from '../../src/modules/sale/drizzle-sale.repository.js';

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
    discountAmount?: number;
    occurredAt: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    taxAmount?: number;
    tenantId: string;
    terminalCode: string;
    terminalId: string;
    totalAmount: number;
    unitPrice: number;
  }
) =>
  repository.createSale({
    items: [
      {
        discountAmount: input.discountAmount ?? 0,
        productId: input.productId,
        productName: input.productName,
        productSku: input.productSku,
        quantity: input.quantity,
        saleId: '',
        subtotalAmount: input.unitPrice * input.quantity,
        taxAmount: input.taxAmount ?? 0,
        tenantId: input.tenantId,
        totalAmount: input.totalAmount,
        unitPrice: input.unitPrice
      }
    ],
    inventoryMovements: [
      {
        branchId: input.branchId,
        businessId: input.businessId,
        movementType: 'SALE',
        occurredAt: new Date(input.occurredAt),
        productId: input.productId,
        quantityDelta: -input.quantity,
        tenantId: input.tenantId
      }
    ],
    sale: {
      branchCode: input.branchCode,
      branchId: input.branchId,
      businessId: input.businessId,
      cashierUserId: input.cashierUserId,
      changeAmount: 0,
      discountAmount: input.discountAmount ?? 0,
      occurredAt: new Date(input.occurredAt),
      paymentMethod: 'CARD',
      subtotalAmount: input.unitPrice * input.quantity,
      taxAmount: input.taxAmount ?? 0,
      tenderedAmount: input.totalAmount,
      tenantId: input.tenantId,
      terminalCode: input.terminalCode,
      terminalId: input.terminalId,
      totalAmount: input.totalAmount
    }
  });
