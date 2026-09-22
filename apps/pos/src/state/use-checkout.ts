import { useCallback, useState } from 'react';
import type {
  CheckoutPrintOutcome,
  ClientSaleDetail,
  CreateLocalSaleItemInput,
  LocalCheckoutResult,
  PaymentMethod
} from '@smart-pos/client-data';

import type { CartState } from './cart-types.js';
import { usePosContext } from './use-pos-context.js';

export type CheckoutStatus = 'error' | 'idle' | 'processing' | 'success';
export type DemandBillStatus = 'done' | 'idle' | 'printing';

const toSaleItems = (cart: CartState): CreateLocalSaleItemInput[] =>
  cart.lines.map((line) => ({
    discountAmount: Math.round((line.quantity * line.unitPrice * cart.discountPercent) / 100),
    productId: line.productId,
    quantity: line.quantity,
    variantId: line.variantId
  }));

export const useCheckout = () => {
  const { checkoutService, store, syncService, terminalContext } = usePosContext();
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [result, setResult] = useState<LocalCheckoutResult | null>(null);
  const [saleDetail, setSaleDetail] = useState<ClientSaleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billStatus, setBillStatus] = useState<DemandBillStatus>('idle');
  const [billOutcome, setBillOutcome] = useState<CheckoutPrintOutcome | null>(null);

  const submit = useCallback(
    async (input: { cart: CartState; method: PaymentMethod; tenderedAmount?: number }) => {
      setStatus('processing');
      setError(null);

      const items = toSaleItems(input.cart);

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

  const printDemandBill = useCallback(
    async (cart: CartState) => {
      setBillStatus('printing');
      try {
        const outcome = await checkoutService.printDemandBill({
          context: terminalContext,
          customerId: cart.customerId ?? undefined,
          items: toSaleItems(cart)
        });
        setBillOutcome(outcome);
      } catch (cause) {
        setBillOutcome({
          message: cause instanceof Error ? cause.message : 'Could not print the bill',
          status: 'FAILED'
        });
      } finally {
        setBillStatus('done');
      }
    },
    [checkoutService, terminalContext]
  );

  const resetBill = useCallback(() => {
    setBillStatus('idle');
    setBillOutcome(null);
  }, []);

  return {
    billOutcome,
    billStatus,
    error,
    printDemandBill,
    reset,
    resetBill,
    result,
    saleDetail,
    status,
    submit
  };
};
