import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { formatMoney } from '../../lib/currency.js';
import type { KioskOrderStage } from '../../state/use-kiosk-order.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type KioskOrderStatusModalProps = {
  currencyCode: string;
  onClose: () => void;
  stage: KioskOrderStage;
};

export const KioskOrderStatusModal = ({ currencyCode, onClose, stage }: KioskOrderStatusModalProps) => {
  if (stage.type === 'idle') {
    return null;
  }

  if (stage.type === 'creating') {
    return (
      <Modal onClose={() => undefined} open title="Placing your order">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 size={40} className="animate-spin text-brand-500" />
          <p className="text-sm text-ink-faint">One moment…</p>
        </div>
      </Modal>
    );
  }

  if (stage.type === 'awaitingPayment') {
    return (
      <Modal onClose={() => undefined} open title="Scan to pay">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-3xl font-extrabold text-ink">{formatMoney(stage.order.totalAmount, currencyCode)}</p>
          {stage.order.gatewayQrImageUrl ? (
            <img
              alt="Scan this UPI QR code to pay"
              className="h-64 w-64 rounded-2xl border border-line bg-white p-2"
              src={stage.order.gatewayQrImageUrl}
            />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-surface-sunken text-sm text-ink-faint">
              Preparing QR code…
            </div>
          )}
          <p className="text-sm text-ink-faint">
            Token {stage.order.tokenNumber} · Scan with any UPI app to pay. Your token prints automatically once
            payment is confirmed.
          </p>
          <div className="flex items-center gap-2 text-xs font-medium text-ink-faint">
            <Loader2 size={14} className="animate-spin" />
            Waiting for payment…
          </div>
        </div>
      </Modal>
    );
  }

  if (stage.type === 'printed') {
    return (
      <Modal onClose={onClose} open title="Order placed">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 size={48} className="text-success-500" />
          <p className="text-2xl font-extrabold text-ink">Token {stage.order.tokenNumber}</p>
          <p className="text-sm text-ink-faint">
            {stage.order.paidStamp
              ? 'Paid — take your printed token to collect your order.'
              : 'Take your printed token to the counter to pay and collect your order.'}
          </p>
          <Button fullWidth onClick={onClose} size="lg" variant="brand">
            Start next order
          </Button>
        </div>
      </Modal>
    );
  }

  const message = stage.type === 'expired' || stage.type === 'error' ? stage.message : '';

  return (
    <Modal onClose={onClose} open title={stage.type === 'expired' ? 'Payment timed out' : 'Something went wrong'}>
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <AlertTriangle size={40} className="text-warn-500" />
        <p className="text-sm text-ink-muted">{message}</p>
        <Button fullWidth onClick={onClose} size="lg" variant="brand">
          Try again
        </Button>
      </div>
    </Modal>
  );
};
