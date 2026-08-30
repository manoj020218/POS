import type { PaymentMethod } from '@smart-pos/client-data';

import { formatMoney } from '../../lib/currency.js';
import { Button } from '../common/Button.js';

const methodLabel: Record<Exclude<PaymentMethod, 'CASH'>, string> = {
  CARD: 'card',
  OTHER: 'other method',
  UPI: 'UPI'
};

type ExactPaymentPanelProps = {
  currencyCode: string;
  method: Exclude<PaymentMethod, 'CASH'>;
  onConfirm: () => void;
  processing: boolean;
  totalAmount: number;
};

export const ExactPaymentPanel = ({ currencyCode, method, onConfirm, processing, totalAmount }: ExactPaymentPanelProps) => (
  <div className="space-y-6 py-4 text-center">
    <p className="text-sm font-semibold text-ink-muted">Collect {formatMoney(totalAmount, currencyCode)} via {methodLabel[method]}</p>
    <p className="text-5xl font-extrabold text-ink">{formatMoney(totalAmount, currencyCode)}</p>
    <Button disabled={processing} fullWidth onClick={onConfirm} size="lg" variant="success">
      {processing ? 'Processing…' : 'Confirm payment received'}
    </Button>
  </div>
);
