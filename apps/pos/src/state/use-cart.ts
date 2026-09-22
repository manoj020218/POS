import { useCallback, useMemo, useReducer } from 'react';
import { calculateCheckoutSaleTotals, type ClientProductRecord, type ClientProductVariant } from '@smart-pos/client-data';

import { emptyCartState, type CartState } from './cart-types.js';

const sameLine = (line: { productId: string; variantId?: string }, productId: string, variantId?: string) =>
  line.productId === productId && line.variantId === variantId;

type CartAction =
  | { product: ClientProductRecord; type: 'ADD_PRODUCT'; variant?: ClientProductVariant }
  | { product: ClientProductRecord; quantity: number; type: 'ADD_PRODUCT_QUANTITY'; variant?: ClientProductVariant }
  | { productId: string; type: 'INCREMENT'; variantId?: string }
  | { productId: string; type: 'DECREMENT'; variantId?: string }
  | { productId: string; type: 'REMOVE'; variantId?: string }
  | { productId: string; type: 'UPDATE_PRICE'; unitPrice: number; variantId?: string }
  | { discountPercent: number; type: 'SET_DISCOUNT' }
  | { customerId: string | null; type: 'SET_CUSTOMER' }
  | { type: 'CLEAR' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const existing = state.lines.find((line) => sameLine(line, action.product.id, action.variant?.id));
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            sameLine(line, action.product.id, action.variant?.id) ? { ...line, quantity: line.quantity + 1 } : line
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
            unitPrice: action.variant?.sellingPrice ?? action.product.sellingPrice,
            unitSymbol: action.product.unitSymbol,
            variantId: action.variant?.id,
            variantName: action.variant?.name
          }
        ]
      };
    }
    case 'ADD_PRODUCT_QUANTITY': {
      const existing = state.lines.find((line) => sameLine(line, action.product.id, action.variant?.id));
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            sameLine(line, action.product.id, action.variant?.id)
              ? { ...line, quantity: line.quantity + action.quantity }
              : line
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
            quantity: action.quantity,
            sku: action.product.sku,
            taxRateBasisPoints: action.product.taxRateBasisPoints,
            trackInventory: action.product.trackInventory,
            unitPrice: action.variant?.sellingPrice ?? action.product.sellingPrice,
            unitSymbol: action.product.unitSymbol,
            variantId: action.variant?.id,
            variantName: action.variant?.name
          }
        ]
      };
    }
    case 'INCREMENT':
      return {
        ...state,
        lines: state.lines.map((line) =>
          sameLine(line, action.productId, action.variantId) ? { ...line, quantity: line.quantity + 1 } : line
        )
      };
    case 'DECREMENT':
      return {
        ...state,
        lines: state.lines
          .map((line) =>
            sameLine(line, action.productId, action.variantId) ? { ...line, quantity: line.quantity - 1 } : line
          )
          .filter((line) => line.quantity > 0)
      };
    case 'REMOVE':
      return {
        ...state,
        lines: state.lines.filter((line) => !sameLine(line, action.productId, action.variantId))
      };
    case 'UPDATE_PRICE':
      return {
        ...state,
        lines: state.lines.map((line) =>
          sameLine(line, action.productId, action.variantId) ? { ...line, unitPrice: action.unitPrice } : line
        )
      };
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

  const addProduct = useCallback(
    (product: ClientProductRecord, variant?: ClientProductVariant) => dispatch({ product, type: 'ADD_PRODUCT', variant }),
    []
  );
  const addProductWithQuantity = useCallback(
    (product: ClientProductRecord, quantity: number, variant?: ClientProductVariant) =>
      dispatch({ product, quantity, type: 'ADD_PRODUCT_QUANTITY', variant }),
    []
  );
  const increment = useCallback(
    (productId: string, variantId?: string) => dispatch({ productId, type: 'INCREMENT', variantId }),
    []
  );
  const decrement = useCallback(
    (productId: string, variantId?: string) => dispatch({ productId, type: 'DECREMENT', variantId }),
    []
  );
  const remove = useCallback(
    (productId: string, variantId?: string) => dispatch({ productId, type: 'REMOVE', variantId }),
    []
  );
  const updatePrice = useCallback(
    (productId: string, unitPrice: number, variantId?: string) =>
      dispatch({ productId, type: 'UPDATE_PRICE', unitPrice, variantId }),
    []
  );
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

  return {
    addProduct,
    addProductWithQuantity,
    cart,
    clear,
    decrement,
    increment,
    remove,
    setCustomer,
    setDiscountPercent,
    totals,
    updatePrice
  };
};

export type CartApi = ReturnType<typeof useCart>;
