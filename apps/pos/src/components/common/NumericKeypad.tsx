import { Delete } from 'lucide-react';

export type NumericKey = '.' | 'backspace' | 'clear' | `${number}`;

type NumericKeypadProps = {
  allowDecimal?: boolean;
  onPress: (key: NumericKey) => void;
};

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export const NumericKeypad = ({ allowDecimal = true, onPress }: NumericKeypadProps) => (
  <div className="grid grid-cols-3 gap-2">
    {digits.map((digit) => (
      <button
        className="h-16 rounded-2xl bg-surface-sunken text-xl font-bold text-ink active:bg-line"
        key={digit}
        onClick={() => onPress(digit)}
        type="button"
      >
        {digit}
      </button>
    ))}

    <button
      className="h-16 rounded-2xl bg-surface-sunken text-xl font-bold text-ink disabled:opacity-30 active:bg-line"
      disabled={!allowDecimal}
      onClick={() => onPress('.')}
      type="button"
    >
      .
    </button>
    <button
      className="h-16 rounded-2xl bg-surface-sunken text-xl font-bold text-ink active:bg-line"
      onClick={() => onPress('0')}
      type="button"
    >
      0
    </button>
    <button
      aria-label="Backspace"
      className="flex h-16 items-center justify-center rounded-2xl bg-surface-sunken text-ink active:bg-line"
      onClick={() => onPress('backspace')}
      type="button"
    >
      <Delete size={22} />
    </button>
  </div>
);
