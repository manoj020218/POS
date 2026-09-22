import { AlertTriangle, Printer, Receipt } from 'lucide-react';
import type { CheckoutPrintOutcome } from '@smart-pos/client-data';

import { formatMoney } from '../../lib/currency.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type DemandBillResultModalProps = {
  currencyCode: string;
  onClose: () => void;
  open: boolean;
  outcome: CheckoutPrintOutcome | null;
  totalAmount: number;
};

const statusCopy: Record<CheckoutPrintOutcome['status'], { message: string; tone: 'danger' | 'success' }> = {
  FAILED: { message: 'Printing failed -- check the printer and try again.', tone: 'danger' },
  PRINTED: { message: 'Handed to the customer -- collect payment, then tap Cash/Card/UPI.', tone: 'success' },
  SKIPPED: { message: 'No printer configured for this branch.', tone: 'danger' }
};

export const DemandBillResultModal = ({
  currencyCode,
  onClose,
  open,
  outcome,
  totalAmount
}: DemandBillResultModalProps) => {
  if (!open || !outcome) {
    return null;
  }

  const copy = statusCopy[outcome.status];

  return (
    <Modal onClose={onClose} open={open} title="Payment due bill" widthClassName="max-w-md">
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <Receipt size={48} className="text-brand-500" />
          <p className="text-lg font-extrabold text-ink">{formatMoney(totalAmount, currencyCode)} due</p>
        </div>

        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
            copy.tone === 'success' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
          }`}
        >
          {copy.tone === 'success' ? <Printer size={18} /> : <AlertTriangle size={18} />}
          {copy.message}
        </div>

        <Button fullWidth onClick={onClose} size="lg" variant="brand">
          Got it
        </Button>
      </div>
    </Modal>
  );
};
