import { Banknote, CreditCard, Printer, QrCode } from 'lucide-react';
import type { PaymentMethod } from '@smart-pos/client-data';

// A distinct color per method so the cashier can recognize the button by
// color alone at a glance, not just by reading the (sometimes icon-only)
// label.
const methods: { colorClass: string; icon: typeof Banknote; label: string; method: PaymentMethod }[] = [
  { colorClass: 'bg-success-500 active:bg-success-600', icon: Banknote, label: 'Cash', method: 'CASH' },
  { colorClass: 'bg-brand-500 active:bg-brand-700', icon: CreditCard, label: 'Card', method: 'CARD' },
  { colorClass: 'bg-warn-500 active:bg-warn-600', icon: QrCode, label: 'UPI', method: 'UPI' }
];

type PaymentBarProps = {
  disabled: boolean;
  onPrintBill: () => void;
  onSelect: (method: PaymentMethod) => void;
  printingBill: boolean;
};

// Dhaba-style flow: cashier prints a "Payment Due" bill for the table
// before any money changes hands, then taps Cash/Card/UPI once the
// customer actually pays -- that's the only step that records the sale
// and prints the real invoice.
export const PaymentBar = ({ disabled, onPrintBill, onSelect, printingBill }: PaymentBarProps) => (
  <div className="space-y-2">
    <div className="grid grid-cols-3 gap-1.5 @sm:gap-2">
      {methods.map(({ colorClass, icon: Icon, label, method }) => (
        <button
          aria-label={label}
          className={`flex min-h-12 items-center justify-center gap-1 whitespace-nowrap rounded-2xl px-1 text-xs font-bold text-white shadow-kiosk disabled:opacity-40 @sm:h-14 @sm:gap-2 @sm:text-sm ${colorClass}`}
          disabled={disabled}
          key={method}
          onClick={() => onSelect(method)}
          type="button"
        >
          <Icon className="shrink-0" size={18} />
          <span className="hidden @xs:inline">{label}</span>
        </button>
      ))}
    </div>
    <button
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 px-2 py-2 text-center text-xs font-bold text-brand-700 disabled:opacity-40 @sm:text-sm"
      disabled={disabled || printingBill}
      onClick={onPrintBill}
      type="button"
    >
      <Printer className="shrink-0" size={18} />
      <span className="@sm:hidden">{printingBill ? 'Printing…' : 'Print bill'}</span>
      <span className="hidden @sm:inline">{printingBill ? 'Printing…' : 'Print bill (payment due)'}</span>
    </button>
  </div>
);
