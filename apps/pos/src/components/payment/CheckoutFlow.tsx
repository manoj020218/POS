import { useState } from 'react';
import type { PaymentMethod } from '@smart-pos/client-data';

import { useCheckout } from '../../state/use-checkout.js';
import type { CartState } from '../../state/cart-types.js';
import { ReceiptResultModal } from '../receipt/ReceiptResultModal.js';
import { DemandBillResultModal } from './DemandBillResultModal.js';
import { HoldBillPromptModal } from './HoldBillPromptModal.js';
import { PaymentBar } from './PaymentBar.js';
import { PaymentModal } from './PaymentModal.js';

type CheckoutFlowProps = {
  cart: CartState;
  currencyCode: string;
  /** Called once a demand bill has been printed (or attempted) -- the caller parks the cart under this label and clears the counter for the next customer. */
  onHoldBill?: (label: string, cart: CartState, totalAmount: number) => void;
  onSaleCompleted: () => void;
  /** Fired the moment a sale is recorded, before the user dismisses the receipt — lets a caller link the sale back to something else (e.g. a kiosk token) without waiting for "Start new sale". */
  onSaleRecorded?: (saleId: string) => void;
  totalAmount: number;
};

export const CheckoutFlow = ({
  cart,
  currencyCode,
  onHoldBill,
  onSaleCompleted,
  onSaleRecorded,
  totalAmount
}: CheckoutFlowProps) => {
  const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
  const [holdPromptOpen, setHoldPromptOpen] = useState(false);
  const [heldAmount, setHeldAmount] = useState(0);
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

  const handlePrintBill = async (label: string) => {
    setHoldPromptOpen(false);
    setHeldAmount(totalAmount);
    await printDemandBill(cart);
    onHoldBill?.(label, cart, totalAmount);
  };

  return (
    <>
      <PaymentBar
        disabled={cart.lines.length === 0}
        onPrintBill={() => setHoldPromptOpen(true)}
        onSelect={setActiveMethod}
        printingBill={billStatus === 'printing'}
      />

      <HoldBillPromptModal
        onClose={() => setHoldPromptOpen(false)}
        onConfirm={(label) => void handlePrintBill(label)}
        open={holdPromptOpen}
      />

      <DemandBillResultModal
        currencyCode={currencyCode}
        onClose={resetBill}
        open={billStatus === 'done'}
        outcome={billOutcome}
        totalAmount={heldAmount}
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
