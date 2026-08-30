import { Banknote, CreditCard, QrCode, Wallet } from 'lucide-react';
import type { PaymentMethod } from '@smart-pos/client-data';

const methods: { icon: typeof Banknote; label: string; method: PaymentMethod }[] = [
  { icon: Banknote, label: 'Cash', method: 'CASH' },
  { icon: CreditCard, label: 'Card', method: 'CARD' },
  { icon: QrCode, label: 'UPI', method: 'UPI' },
  { icon: Wallet, label: 'Other', method: 'OTHER' }
];

type PaymentBarProps = {
  disabled: boolean;
  onSelect: (method: PaymentMethod) => void;
};

export const PaymentBar = ({ disabled, onSelect }: PaymentBarProps) => (
  <div className="grid grid-cols-2 gap-2">
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
);
