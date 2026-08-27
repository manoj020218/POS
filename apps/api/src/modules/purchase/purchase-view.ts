import type { BranchRecord, BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type {
  PurchaseDetailRecord,
  PurchaseRecord,
  PurchaseSummaryView,
  PurchaseView
} from './purchase.types.js';

export const toPurchaseSummaryView = (
  purchase: PurchaseRecord,
  business: BusinessRecord,
  branch: BranchRecord
): PurchaseSummaryView => ({
  branchCode: purchase.branchCode,
  branchId: purchase.branchId,
  branchName: branch.name,
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  createdByUserId: purchase.createdByUserId,
  id: purchase.id,
  itemCount: purchase.itemCount,
  notes: purchase.notes,
  occurredAt: purchase.occurredAt,
  referenceNumber: purchase.referenceNumber,
  supplierId: purchase.supplierId,
  supplierName: purchase.supplierName,
  totalAmount: purchase.totalAmount,
  totalQuantity: purchase.totalQuantity
});

export const toPurchaseView = (
  detail: PurchaseDetailRecord,
  business: BusinessRecord,
  branch: BranchRecord
): PurchaseView => ({
  ...toPurchaseSummaryView(detail.purchase, business, branch),
  items: detail.items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    quantity: item.quantity,
    totalCost: item.totalCost,
    unitCost: item.unitCost
  }))
});
