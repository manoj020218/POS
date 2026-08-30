import type { PaymentMethod } from '@smart-pos/client-data';

import { Modal } from '../common/Modal.js';
import { CashPaymentPanel } from './CashPaymentPanel.js';
import { ExactPaymentPanel } from './ExactPaymentPanel.js';

const titleByMethod: Record<PaymentMethod, string> = {
  CARD: 'Card payment',
  CASH: 'Cash payment',
  OTHER: 'Other payment',
  UPI: 'UPI payment'
};

type PaymentModalProps = {
  currencyCode: string;
  error?: string | null;
  method: PaymentMethod | null;
  onClose: () => void;
  onConfirm: (tenderedAmount?: number) => void;
  processing: boolean;
  totalAmount: number;
};

export const PaymentModal = ({
  currencyCode,
  error,
  method,
  onClose,
  onConfirm,
  processing,
  totalAmount
}: PaymentModalProps) => (
  <Modal onClose={onClose} open={method !== null} title={method ? titleByMethod[method] : ''} widthClassName="max-w-sm">
    {error && (
      <p className="mb-4 rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>
    )}
    {method === 'CASH' && (
      <CashPaymentPanel currencyCode={currencyCode} onConfirm={onConfirm} processing={processing} totalAmount={totalAmount} />
    )}
    {method && method !== 'CASH' && (
      <ExactPaymentPanel
        currencyCode={currencyCode}
        method={method}
        onConfirm={() => onConfirm()}
        processing={processing}
        totalAmount={totalAmount}
      />
    )}
  </Modal>
);
