import { formatMoneyCompact } from '../../lib/currency.js';

type QuickAmountChipsProps = {
  amounts: number[];
  currencyCode: string;
  onSelect: (amount: number) => void;
  selectedAmount: number | null;
};

export const QuickAmountChips = ({ amounts, currencyCode, onSelect, selectedAmount }: QuickAmountChipsProps) => (
  <div className="grid grid-cols-4 gap-2">
    {amounts.map((amount) => (
      <button
        className={`h-12 rounded-xl text-sm font-bold transition-colors ${
          amount === selectedAmount
            ? 'bg-success-500 text-white'
            : 'bg-surface-sunken text-ink-muted active:bg-line'
        }`}
        key={amount}
        onClick={() => onSelect(amount)}
        type="button"
      >
        {formatMoneyCompact(amount, currencyCode)}
      </button>
    ))}
  </div>
);
