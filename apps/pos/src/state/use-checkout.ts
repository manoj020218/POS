import { useCallback, useState } from 'react';
import type {
  ClientSaleDetail,
  CreateLocalSaleItemInput,
  LocalCheckoutResult,
  PaymentMethod
} from '@smart-pos/client-data';

import type { CartState } from './cart-types.js';
import { usePosContext } from './use-pos-context.js';

export type CheckoutStatus = 'error' | 'idle' | 'processing' | 'success';

export const useCheckout = () => {
  const { checkoutService, store, syncService, terminalContext } = usePosContext();
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [result, setResult] = useState<LocalCheckoutResult | null>(null);
  const [saleDetail, setSaleDetail] = useState<ClientSaleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (input: { cart: CartState; method: PaymentMethod; tenderedAmount?: number }) => {
      setStatus('processing');
      setError(null);

      const items: CreateLocalSaleItemInput[] = input.cart.lines.map((line) => ({
        discountAmount: Math.round((line.quantity * line.unitPrice * input.cart.discountPercent) / 100),
        productId: line.productId,
        quantity: line.quantity
      }));

      try {
        const outcome = await checkoutService.completeSale({
          context: terminalContext,
          customerId: input.cart.customerId ?? undefined,
          items,
          payment: { method: input.method, tenderedAmount: input.tenderedAmount }
        });

        setResult(outcome);
        setSaleDetail(await store.sales.findSaleById(outcome.saleId));
        setStatus('success');
        void syncService.pushPendingEvents().catch(() => undefined);
        return outcome;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Checkout failed';
        setError(message);
        setStatus('error');
        return null;
      }
    },
    [checkoutService, store, syncService, terminalContext]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setSaleDetail(null);
    setError(null);
  }, []);

  return { error, reset, result, saleDetail, status, submit };
};
