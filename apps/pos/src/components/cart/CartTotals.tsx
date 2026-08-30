import { formatMoney } from '../../lib/currency.js';

type CartTotalsProps = {
  currencyCode: string;
  totals: { discountAmount: number; subtotalAmount: number; taxAmount: number; totalAmount: number };
};

const Row = ({ label, muted = false, value }: { label: string; muted?: boolean; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className={muted ? 'text-ink-faint' : 'text-ink-muted'}>{label}</span>
    <span className={muted ? 'text-ink-faint' : 'font-semibold text-ink'}>{value}</span>
  </div>
);

export const CartTotals = ({ currencyCode, totals }: CartTotalsProps) => (
  <div className="space-y-1.5 rounded-2xl bg-surface-sunken p-4">
    <Row label="Subtotal" value={formatMoney(totals.subtotalAmount, currencyCode)} />
    {totals.discountAmount > 0 && (
      <Row label="Discount" muted value={`− ${formatMoney(totals.discountAmount, currencyCode)}`} />
    )}
    <Row label="Tax" muted value={formatMoney(totals.taxAmount, currencyCode)} />
    <div className="my-1 border-t border-line" />
    <div className="flex items-center justify-between">
      <span className="text-base font-bold text-ink">Total</span>
      <span className="text-xl font-extrabold text-ink">{formatMoney(totals.totalAmount, currencyCode)}</span>
    </div>
  </div>
);
