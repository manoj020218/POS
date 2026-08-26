import { createHttpError } from '../../lib/http-error.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { CustomerRepository } from '../customer/customer.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { calculateSaleTotals } from './sale-domain.js';
import type { SaleRepository } from './sale.repository.js';
import type { CreateSaleRequest, SaleDetailRecord, SaleView } from './sale.types.js';

export const createSaleService = (
  repository: SaleRepository,
  catalogRepository: CatalogRepository,
  customerRepository: CustomerRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  createSale: async (context: AccessContext, input: CreateSaleRequest): Promise<SaleView> => {
    const branches = await tenantCoreRepository.listBranches(context.tenantId);
    const branch = branches.find((item) => item.id === input.branchId);
    if (!branch) throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    assertBranchAccess(context, branch.id);
    if (!branch.isActive) throw createHttpError(409, 'BRANCH_INACTIVE', 'Branch is inactive');

    const terminal = (
      await tenantCoreRepository.listTerminals(context.tenantId, branch.id)
    ).find((item) => item.id === input.terminalId);
    if (!terminal) throw createHttpError(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    if (!terminal.isActive) {
      throw createHttpError(409, 'TERMINAL_INACTIVE', 'Terminal is inactive');
    }

    ensureUniqueProducts(input.items.map((item) => item.productId));

    const products = await Promise.all(
      input.items.map((item) => catalogRepository.findProductById(item.productId))
    );
    const occurredAt = input.occurredAt ?? new Date();

    const calculated = calculateSaleTotals({
      items: input.items.map((item, index) => {
        const product = products[index];
        if (!product || product.businessId !== branch.businessId) {
          throw createHttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
        }
        if (!product.isActive) {
          throw createHttpError(409, 'PRODUCT_INACTIVE', 'Product is inactive');
        }

        return {
          discountAmount: item.discountAmount,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          taxAmount: item.taxAmount,
          unitPrice: item.unitPrice ?? product.sellingPrice
        };
      }),
      payment: input.payment
    });

    const customer = input.customerId
      ? await customerRepository.findCustomerById(input.customerId)
      : null;
    if (input.customerId) {
      if (!customer || customer.businessId !== branch.businessId) {
        throw createHttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      if (!customer.isActive) {
        throw createHttpError(409, 'CUSTOMER_INACTIVE', 'Customer is inactive');
      }
    }

    const detail = await repository.createSale({
      items: calculated.items.map((item) => ({
        discountAmount: item.discountAmount,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        saleId: '',
        subtotalAmount: item.subtotalAmount,
        taxAmount: item.taxAmount,
        tenantId: context.tenantId,
        totalAmount: item.totalAmount,
        unitPrice: item.unitPrice
      })),
      inventoryMovements: input.items.flatMap((item, index) => {
        const product = products[index]!;
        if (!product.trackInventory) {
          return [];
        }

        return [
          {
            branchId: branch.id,
            businessId: branch.businessId,
            movementType: 'SALE' as const,
            occurredAt,
            productId: product.id,
            quantityDelta: item.quantity * -1,
            tenantId: context.tenantId
          }
        ];
      }),
      sale: {
        branchCode: branch.code,
        branchId: branch.id,
        businessId: branch.businessId,
        cashierUserId: context.userId,
        changeAmount: calculated.changeAmount,
        customerId: customer?.id,
        customerName: customer?.name,
        discountAmount: calculated.discountAmount,
        occurredAt,
        paymentMethod: input.payment.method,
        subtotalAmount: calculated.subtotalAmount,
        taxAmount: calculated.taxAmount,
        tenderedAmount: calculated.tenderedAmount,
        tenantId: context.tenantId,
        terminalCode: terminal.code,
        terminalId: terminal.id,
        totalAmount: calculated.totalAmount
      }
    });

    return toSaleView(detail);
  }
});

const ensureUniqueProducts = (productIds: string[]) => {
  if (new Set(productIds).size !== productIds.length) {
    throw createHttpError(
      400,
      'DUPLICATE_SALE_PRODUCT',
      'Each product may appear only once in a sale payload'
    );
  }
};

const toSaleView = (detail: SaleDetailRecord): SaleView => ({
  branchCode: detail.sale.branchCode,
  branchId: detail.sale.branchId,
  businessId: detail.sale.businessId,
  cashierUserId: detail.sale.cashierUserId,
  changeAmount: detail.sale.changeAmount,
  customerId: detail.sale.customerId,
  customerName: detail.sale.customerName,
  discountAmount: detail.sale.discountAmount,
  id: detail.sale.id,
  invoiceNumber: detail.sale.invoiceNumber,
  invoiceSequence: detail.sale.invoiceSequence,
  items: detail.items.map((item) => ({
    discountAmount: item.discountAmount,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    quantity: item.quantity,
    subtotalAmount: item.subtotalAmount,
    taxAmount: item.taxAmount,
    totalAmount: item.totalAmount,
    unitPrice: item.unitPrice
  })),
  occurredAt: detail.sale.occurredAt,
  paymentMethod: detail.sale.paymentMethod,
  subtotalAmount: detail.sale.subtotalAmount,
  taxAmount: detail.sale.taxAmount,
  tenderedAmount: detail.sale.tenderedAmount,
  terminalCode: detail.sale.terminalCode,
  terminalId: detail.sale.terminalId,
  totalAmount: detail.sale.totalAmount
});
