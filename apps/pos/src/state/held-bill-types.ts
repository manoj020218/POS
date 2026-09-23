import type { CartState } from './cart-types.js';

// A parked, unpaid "payment due" bill -- printed and handed to a table/
// customer, set aside so the cashier can immediately start the next
// order instead of leaving the counter blocked until that bill is paid.
export type HeldBill = {
  cart: CartState;
  createdAt: string;
  id: string;
  label: string;
  totalAmount: number;
};
