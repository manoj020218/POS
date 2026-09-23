import { Receipt } from 'lucide-react';
import type { HeldBill } from '../../state/held-bill-types.js';
import { formatMoneyCompact } from '../../lib/currency.js';

type HeldBillsStackProps = {
  currencyCode: string;
  heldBills: HeldBill[];
  onResume: (bill: HeldBill) => void;
};

// Floating bubble stack for bills that were printed as "payment due" and
// parked so the counter is free for the next customer -- tap one to bring
// it back into the active cart and take payment.
export const HeldBillsStack = ({ currencyCode, heldBills, onResume }: HeldBillsStackProps) => {
  if (heldBills.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-6 left-4 z-40 flex flex-col-reverse gap-2">
      {heldBills.map((bill) => (
        <button
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-brand-300 bg-white/70 px-4 py-2.5 text-left shadow-kiosk-lg backdrop-blur-md active:bg-white/90"
          key={bill.id}
          onClick={() => onResume(bill)}
          type="button"
        >
          <Receipt className="text-brand-600" size={18} />
          <span className="text-sm font-bold text-ink">{bill.label}</span>
          <span className="text-xs font-semibold text-ink-faint">
            {formatMoneyCompact(bill.totalAmount, currencyCode)}
          </span>
        </button>
      ))}
    </div>
  );
};
