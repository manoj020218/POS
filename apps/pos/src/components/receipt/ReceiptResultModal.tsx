import { CheckCircle2, Printer } from 'lucide-react';
import type { ClientSaleDetail, LocalCheckoutResult } from '@smart-pos/client-data';

import { formatMoney } from '../../lib/currency.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type ReceiptResultModalProps = {
  currencyCode: string;
  onNewSale: () => void;
  open: boolean;
  result: LocalCheckoutResult | null;
  saleDetail: ClientSaleDetail | null;
};

const printStatusCopy: Record<LocalCheckoutResult['printOutcome']['status'], string> = {
  FAILED: 'Receipt printing failed for this sale.',
  PRINTED: 'Receipt sent to the printer.',
  SKIPPED: 'No printer configured — showing the receipt on screen.'
};

export const ReceiptResultModal = ({ currencyCode, onNewSale, open, result, saleDetail }: ReceiptResultModalProps) => {
  if (!open || !result || !saleDetail) {
    return null;
  }

  const { sale, items } = saleDetail;

  return (
    <Modal onClose={onNewSale} open={open} title="Sale complete" widthClassName="max-w-md">
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <CheckCircle2 size={48} className="text-success-500" />
          <p className="text-lg font-extrabold text-ink">Invoice {sale.invoiceNumber}</p>
          <p className="text-sm text-ink-faint">
            Paid via {sale.paymentMethod} · {formatMoney(sale.totalAmount, currencyCode)}
          </p>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl bg-surface-sunken p-3">
          {items.map((item) => (
            <div className="flex items-center justify-between text-sm" key={item.productId}>
              <span className="text-ink-muted">
                {item.productName} × {item.quantity}
              </span>
              <span className="font-semibold text-ink">{formatMoney(item.totalAmount, currencyCode)}</span>
            </div>
          ))}
        </div>

        {sale.paymentMethod === 'CASH' && (
          <div className="flex items-center justify-between rounded-xl bg-success-50 px-4 py-3 text-sm font-semibold text-success-600">
            <span>Change given</span>
            <span>{formatMoney(sale.changeAmount, currencyCode)}</span>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-xs font-medium text-brand-700">
          <Printer size={16} />
          {printStatusCopy[result.printOutcome.status]}
        </div>

        <Button fullWidth onClick={onNewSale} size="lg" variant="brand">
          Start new sale
        </Button>
      </div>
    </Modal>
  );
};
