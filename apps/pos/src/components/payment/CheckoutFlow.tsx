import { useState } from 'react';
import type { PaymentMethod } from '@smart-pos/client-data';

import { useCheckout } from '../../state/use-checkout.js';
import type { CartState } from '../../state/cart-types.js';
import { ReceiptResultModal } from '../receipt/ReceiptResultModal.js';
import { PaymentBar } from './PaymentBar.js';
import { PaymentModal } from './PaymentModal.js';

type CheckoutFlowProps = {
  cart: CartState;
  currencyCode: string;
  onSaleCompleted: () => void;
  totalAmount: number;
};

export const CheckoutFlow = ({ cart, currencyCode, onSaleCompleted, totalAmount }: CheckoutFlowProps) => {
  const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
  const { error, reset, result, saleDetail, status, submit } = useCheckout();

  const handleConfirm = async (tenderedAmount?: number) => {
    if (!activeMethod) {
      return;
    }
    const outcome = await submit({ cart, method: activeMethod, tenderedAmount });
    if (outcome) {
      setActiveMethod(null);
    }
  };

  const handleNewSale = () => {
    reset();
    onSaleCompleted();
  };

  return (
    <>
      <PaymentBar disabled={cart.lines.length === 0} onSelect={setActiveMethod} />

      <PaymentModal
        currencyCode={currencyCode}
        error={status === 'error' ? error : null}
        method={activeMethod}
        onClose={() => setActiveMethod(null)}
        onConfirm={handleConfirm}
        processing={status === 'processing'}
        totalAmount={totalAmount}
      />

      <ReceiptResultModal
        currencyCode={currencyCode}
        onNewSale={handleNewSale}
        open={status === 'success'}
        result={result}
        saleDetail={saleDetail}
      />
    </>
  );
};
