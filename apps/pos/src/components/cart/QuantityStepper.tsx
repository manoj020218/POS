import { Minus, Plus } from 'lucide-react';

type QuantityStepperProps = {
  /** Smaller buttons for tight containers (e.g. a narrow cart-panel column) -- same control, less footprint. */
  compact?: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  quantity: number;
};

export const QuantityStepper = ({ compact = false, onDecrement, onIncrement, quantity }: QuantityStepperProps) => {
  const buttonSize = compact ? 'h-5 w-5' : 'h-9 w-9';
  const iconSize = compact ? 12 : 16;

  return (
    <div className={`flex items-center gap-1 rounded-lg bg-surface-sunken ${compact ? 'p-0.5' : 'p-1'}`}>
      <button
        aria-label="Decrease quantity"
        className={`flex items-center justify-center rounded bg-surface-raised text-ink shadow-kiosk active:bg-line ${buttonSize}`}
        onClick={onDecrement}
        type="button"
      >
        <Minus size={iconSize} />
      </button>
      <span className={`text-center font-bold text-ink ${compact ? 'w-4 text-xs' : 'w-8 text-sm'}`}>{quantity}</span>
      <button
        aria-label="Increase quantity"
        className={`flex items-center justify-center rounded bg-brand-500 text-white active:bg-brand-700 ${buttonSize}`}
        onClick={onIncrement}
        type="button"
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
};
