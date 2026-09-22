import { useState } from 'react';
import type { PaymentMethod } from '@smart-pos/client-data';

import { useCheckout } from '../../state/use-checkout.js';
import type { CartState } from '../../state/cart-types.js';
import { ReceiptResultModal } from '../receipt/ReceiptResultModal.js';
import { DemandBillResultModal } from './DemandBillResultModal.js';
import { PaymentBar } from './PaymentBar.js';
import { PaymentModal } from './PaymentModal.js';

type CheckoutFlowProps = {
  cart: CartState;
  currencyCode: string;
  onSaleCompleted: () => void;
  /** Fired the moment a sale is recorded, before the user dismisses the receipt — lets a caller link the sale back to something else (e.g. a kiosk token) without waiting for "Start new sale". */
  onSaleRecorded?: (saleId: string) => void;
  totalAmount: number;
};

export const CheckoutFlow = ({ cart, currencyCode, onSaleCompleted, onSaleRecorded, totalAmount }: CheckoutFlowProps) => {
  const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
  const { billOutcome, billStatus, error, printDemandBill, reset, resetBill, result, saleDetail, status, submit } =
    useCheckout();

  const handleConfirm = async (tenderedAmount?: number) => {
    if (!activeMethod) {
      return;
    }
    const outcome = await submit({ cart, method: activeMethod, tenderedAmount });
    if (outcome) {
      setActiveMethod(null);
      onSaleRecorded?.(outcome.saleId);
    }
  };

  const handleNewSale = () => {
    reset();
    onSaleCompleted();
  };

  return (
    <>
      <PaymentBar
        disabled={cart.lines.length === 0}
        onPrintBill={() => void printDemandBill(cart)}
        onSelect={setActiveMethod}
        printingBill={billStatus === 'printing'}
      />

      <DemandBillResultModal
        currencyCode={currencyCode}
        onClose={resetBill}
        open={billStatus === 'done'}
        outcome={billOutcome}
        totalAmount={totalAmount}
      />

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
