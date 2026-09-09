import { useCallback, useRef, useState } from 'react';
import type { ClientKioskOrderCreatedView, ClientKioskOrderView } from '@smart-pos/client-data';

import { printKioskToken } from '../lib/print-kiosk-token.js';
import type { CartState } from './cart-types.js';
import { usePosContext } from './use-pos-context.js';

const pollIntervalMs = 3000;

export type KioskOrderStage =
  | { type: 'idle' }
  | { type: 'creating' }
  | { order: ClientKioskOrderCreatedView; type: 'awaitingPayment' }
  | { order: ClientKioskOrderView; type: 'printed' }
  | { message: string; type: 'expired' }
  | { message: string; type: 'error' };

export const useKioskOrder = () => {
  const { remoteApi, settings, terminalContext } = usePosContext();
  const [stage, setStage] = useState<KioskOrderStage>({ type: 'idle' });
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const printAndFinish = useCallback(
    async (order: ClientKioskOrderView, printDualTokens: boolean) => {
      await printKioskToken({
        branchId: terminalContext.branchId,
        order,
        paidReference: order.paymentReference,
        printDualTokens,
        settings
      });
      setStage({ order, type: 'printed' });
    },
    [settings, terminalContext.branchId]
  );

  const pollGatewayOrder = useCallback(
    (orderId: string, printDualTokens: boolean) => {
      const tick = async () => {
        try {
          const order = await remoteApi.getKioskOrder(orderId);
          if (order.status === 'FULFILLED') {
            await printAndFinish(order, printDualTokens);
            return;
          }
          if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
            setStage({ message: 'Payment was not completed in time. Please try again.', type: 'expired' });
            return;
          }
          pollTimeoutRef.current = setTimeout(() => void tick(), pollIntervalMs);
        } catch (cause) {
          setStage({
            message: cause instanceof Error ? cause.message : 'Could not check payment status',
            type: 'error'
          });
        }
      };

      void tick();
    },
    [printAndFinish, remoteApi]
  );

  const placeOrder = useCallback(
    async (cart: CartState, printDualTokens: boolean) => {
      stopPolling();
      setStage({ type: 'creating' });

      try {
        const order = await remoteApi.createKioskOrder({
          branchId: terminalContext.branchId,
          items: cart.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          terminalId: terminalContext.terminalId
        });

        if (order.gatewayQrImageUrl) {
          setStage({ order, type: 'awaitingPayment' });
          pollGatewayOrder(order.id, printDualTokens);
          return;
        }

        await printAndFinish(order, printDualTokens);
      } catch (cause) {
        setStage({ message: cause instanceof Error ? cause.message : 'Could not place this order', type: 'error' });
      }
    },
    [pollGatewayOrder, printAndFinish, remoteApi, stopPolling, terminalContext.branchId, terminalContext.terminalId]
  );

  const reset = useCallback(() => {
    stopPolling();
    setStage({ type: 'idle' });
  }, [stopPolling]);

  return { placeOrder, reset, stage };
};
