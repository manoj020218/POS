import { createHttpError } from '../../lib/http-error.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { CustomerRepository } from '../customer/customer.repository.js';
import { resolveEffectiveBusinessSettings } from '../settings/settings-defaults.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { calculateSaleTotals } from './sale-domain.js';
import type { SaleRepository } from './sale.repository.js';
import { ensureUniqueProducts, toSaleView } from './sale-shared.js';
import type { CreateSaleRequest, SaleView } from './sale.types.js';

export const createSaleHandler = (
  repository: SaleRepository,
  catalogRepository: CatalogRepository,
  customerRepository: CustomerRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
) => async (context: AccessContext, input: CreateSaleRequest): Promise<SaleView> => {
  const branches = await tenantCoreRepository.listBranches(context.tenantId);
  const branch = branches.find((item) => item.id === input.branchId);
  if (!branch) throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
  assertBranchAccess(context, branch.id);
  if (!branch.isActive) throw createHttpError(409, 'BRANCH_INACTIVE', 'Branch is inactive');

  const terminal = (await tenantCoreRepository.listTerminals(context.tenantId, branch.id)).find(
    (item) => item.id === input.terminalId
  );
  if (!terminal) throw createHttpError(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
  if (!terminal.isActive) {
    throw createHttpError(409, 'TERMINAL_INACTIVE', 'Terminal is inactive');
  }

  // A product can legitimately appear more than once now (e.g. a Half
  // portion and a Full portion of the same Daal) -- uniqueness is keyed on
  // product+variant, not product alone.
  ensureUniqueProducts(input.items.map((item) => `${item.productId}::${item.variantId ?? ''}`));

  const products = await Promise.all(
    input.items.map((item) => catalogRepository.findProductById(item.productId))
  );
  const variantIds = [...new Set(input.items.flatMap((item) => (item.variantId ? [item.variantId] : [])))];
  const variants =
    variantIds.length > 0
      ? await catalogRepository.listVariantsForProducts(
          context.tenantId,
          [...new Set(input.items.map((item) => item.productId))]
        )
      : [];
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
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

      let variantName: string | undefined;
      let resolvedUnitPrice = item.unitPrice ?? product.sellingPrice;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== product.id) {
          throw createHttpError(404, 'PRODUCT_VARIANT_NOT_FOUND', 'Product variant not found');
        }
        if (!variant.isActive) {
          throw createHttpError(409, 'PRODUCT_VARIANT_INACTIVE', 'Product variant is inactive');
        }
        variantName = variant.name;
        resolvedUnitPrice = item.unitPrice ?? variant.sellingPrice;
      }

      return {
        discountAmount: item.discountAmount,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        taxAmount: item.taxAmount,
        unitPrice: resolvedUnitPrice,
        variantId: item.variantId,
        variantName
      };
    }),
    payment: input.payment
  });

  const customer = input.customerId
    ? await customerRepository.findCustomerById(input.customerId)
    : null;
  const settings = resolveEffectiveBusinessSettings(
    await settingsRepository.findBusinessSettingsByBusinessId(context.tenantId, branch.businessId)
  );
  if (input.customerId) {
    if (!customer || customer.businessId !== branch.businessId) {
      throw createHttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }
    if (!customer.isActive) {
      throw createHttpError(409, 'CUSTOMER_INACTIVE', 'Customer is inactive');
    }
  }

  const detail = await repository.createSale({
    invoicePrefix: settings.invoicePrefix,
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
      unitPrice: item.unitPrice,
      variantId: item.variantId,
      variantName: item.variantName
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
};
