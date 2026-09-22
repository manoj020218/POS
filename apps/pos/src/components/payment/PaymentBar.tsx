import { Banknote, CreditCard, Printer, QrCode } from 'lucide-react';
import type { PaymentMethod } from '@smart-pos/client-data';

const methods: { icon: typeof Banknote; label: string; method: PaymentMethod }[] = [
  { icon: Banknote, label: 'Cash', method: 'CASH' },
  { icon: CreditCard, label: 'Card', method: 'CARD' },
  { icon: QrCode, label: 'UPI', method: 'UPI' }
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
    <div className="grid grid-cols-3 gap-2">
      {methods.map(({ icon: Icon, label, method }) => (
        <button
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-500 text-sm font-bold text-white shadow-kiosk disabled:opacity-40"
          disabled={disabled}
          key={method}
          onClick={() => onSelect(method)}
          type="button"
        >
          <Icon size={20} />
          {label}
        </button>
      ))}
    </div>
    <button
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 text-sm font-bold text-brand-700 disabled:opacity-40"
      disabled={disabled || printingBill}
      onClick={onPrintBill}
      type="button"
    >
      <Printer size={18} />
      {printingBill ? 'Printing…' : 'Print bill (payment due)'}
    </button>
  </div>
);
