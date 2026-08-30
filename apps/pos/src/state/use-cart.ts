import { useCallback, useMemo, useReducer } from 'react';
import { calculateCheckoutSaleTotals, type ClientProductRecord } from '@smart-pos/client-data';

import { emptyCartState, type CartState } from './cart-types.js';

type CartAction =
  | { type: 'ADD_PRODUCT'; product: ClientProductRecord }
  | { productId: string; type: 'INCREMENT' }
  | { productId: string; type: 'DECREMENT' }
  | { productId: string; type: 'REMOVE' }
  | { discountPercent: number; type: 'SET_DISCOUNT' }
  | { customerId: string | null; type: 'SET_CUSTOMER' }
  | { type: 'CLEAR' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const existing = state.lines.find((line) => line.productId === action.product.id);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            line.productId === action.product.id ? { ...line, quantity: line.quantity + 1 } : line
          )
        };
      }

      return {
        ...state,
        lines: [
          ...state.lines,
          {
            name: action.product.name,
            productId: action.product.id,
            quantity: 1,
            sku: action.product.sku,
            taxRateBasisPoints: action.product.taxRateBasisPoints,
            trackInventory: action.product.trackInventory,
            unitPrice: action.product.sellingPrice,
            unitSymbol: action.product.unitSymbol
          }
        ]
      };
    }
    case 'INCREMENT':
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.productId === action.productId ? { ...line, quantity: line.quantity + 1 } : line
        )
      };
    case 'DECREMENT':
      return {
        ...state,
        lines: state.lines
          .map((line) =>
            line.productId === action.productId ? { ...line, quantity: line.quantity - 1 } : line
          )
          .filter((line) => line.quantity > 0)
      };
    case 'REMOVE':
      return { ...state, lines: state.lines.filter((line) => line.productId !== action.productId) };
    case 'SET_DISCOUNT':
      return { ...state, discountPercent: action.discountPercent };
    case 'SET_CUSTOMER':
      return { ...state, customerId: action.customerId };
    case 'CLEAR':
      return emptyCartState;
    default:
      return state;
  }
};

export const useCart = () => {
  const [cart, dispatch] = useReducer(cartReducer, emptyCartState);

  const addProduct = useCallback((product: ClientProductRecord) => dispatch({ product, type: 'ADD_PRODUCT' }), []);
  const increment = useCallback((productId: string) => dispatch({ productId, type: 'INCREMENT' }), []);
  const decrement = useCallback((productId: string) => dispatch({ productId, type: 'DECREMENT' }), []);
  const remove = useCallback((productId: string) => dispatch({ productId, type: 'REMOVE' }), []);
  const setDiscountPercent = useCallback(
    (discountPercent: number) => dispatch({ discountPercent, type: 'SET_DISCOUNT' }),
    []
  );
  const setCustomer = useCallback(
    (customerId: string | null) => dispatch({ customerId, type: 'SET_CUSTOMER' }),
    []
  );
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const totals = useMemo(() => {
    if (cart.lines.length === 0) {
      return { changeAmount: 0, discountAmount: 0, subtotalAmount: 0, taxAmount: 0, totalAmount: 0 };
    }

    return calculateCheckoutSaleTotals({
      items: cart.lines.map((line) => {
        const lineSubtotal = line.quantity * line.unitPrice;
        return {
          discountAmount: Math.round((lineSubtotal * cart.discountPercent) / 100),
          productId: line.productId,
          productName: line.name,
          productSku: line.sku,
          quantity: line.quantity,
          taxRateBasisPoints: line.taxRateBasisPoints,
          trackInventory: line.trackInventory,
          unitPrice: line.unitPrice
        };
      }),
      payment: { method: 'CASH' }
    });
  }, [cart.lines, cart.discountPercent]);

  return { addProduct, cart, clear, decrement, increment, remove, setCustomer, setDiscountPercent, totals };
};

export type CartApi = ReturnType<typeof useCart>;
