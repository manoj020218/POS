import { Minus, Plus } from 'lucide-react';

type QuantityStepperProps = {
  onDecrement: () => void;
  onIncrement: () => void;
  quantity: number;
};

export const QuantityStepper = ({ onDecrement, onIncrement, quantity }: QuantityStepperProps) => (
  <div className="flex items-center gap-1 rounded-xl bg-surface-sunken p-1">
    <button
      aria-label="Decrease quantity"
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised text-ink shadow-kiosk active:bg-line"
      onClick={onDecrement}
      type="button"
    >
      <Minus size={16} />
    </button>
    <span className="w-8 text-center text-sm font-bold text-ink">{quantity}</span>
    <button
      aria-label="Increase quantity"
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white active:bg-brand-700"
      onClick={onIncrement}
      type="button"
    >
      <Plus size={16} />
    </button>
  </div>
);
