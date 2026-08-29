import type { CustomerSearchInput, ClientCustomerRecord } from './customer-repository.js';
import type { ProductSearchInput, ClientProductRecord } from './product-repository.js';
import type { ClientStockBalanceRecord } from './stock-repository.js';

export const clone = <T>(value: T) => structuredClone(value);

export const stockKey = (businessId: string, productId: string) => `${businessId}:${productId}`;

export const readStockBalance = (
  balances: Map<string, ClientStockBalanceRecord>,
  products: Map<string, ClientProductRecord>,
  businessId: string,
  productId: string
) => {
  const existing = balances.get(stockKey(businessId, productId));
  if (existing) {
    return clone(existing);
  }

  const product = products.get(productId);
  if (!product || product.businessId !== businessId) {
    return null;
  }

  return {
    businessId,
    productId,
    quantityOnHand: product.openingStock,
    updatedAt: product.updatedAt
  };
};

export const searchCustomers = (
  records: Iterable<ClientCustomerRecord>,
  input: CustomerSearchInput
) => {
  const query = input.query?.trim().toLowerCase() ?? '';

  return [...records]
    .filter((customer) => !input.businessId || customer.businessId === input.businessId)
    .filter(
      (customer) =>
        query.length === 0 ||
        customer.name.toLowerCase().includes(query) ||
        customer.mobile?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
    )
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
    .slice(0, input.limit)
    .map(clone);
};

export const searchProducts = (
  records: Iterable<ClientProductRecord>,
  input: ProductSearchInput
) => {
  const query = input.query.trim().toLowerCase();
  const candidates = [...records].filter(
    (product) => !input.businessId || product.businessId === input.businessId
  );
  const exactBarcodeMatches =
    query.length === 0 ? [] : candidates.filter((product) => product.barcode?.toLowerCase() === query);

  return [...exactBarcodeMatches, ...candidates]
    .filter((product, index, items) => items.findIndex((candidate) => candidate.id === product.id) === index)
    .filter(
      (product) =>
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query)
    )
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
    .slice(0, input.limit)
    .map(clone);
};
