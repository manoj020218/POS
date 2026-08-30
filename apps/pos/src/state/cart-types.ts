export type CartLine = {
  name: string;
  productId: string;
  quantity: number;
  sku: string;
  taxRateBasisPoints: number;
  trackInventory: boolean;
  unitPrice: number;
  unitSymbol?: string;
};

export type CartState = {
  customerId: string | null;
  discountPercent: number;
  lines: CartLine[];
};

export const emptyCartState: CartState = {
  customerId: null,
  discountPercent: 0,
  lines: []
};
