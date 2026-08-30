import { Trash2 } from 'lucide-react';

import { formatMoney } from '../../lib/currency.js';
import type { CartLine } from '../../state/cart-types.js';
import { IconButton } from '../common/IconButton.js';
import { QuantityStepper } from './QuantityStepper.js';

type CartLineItemProps = {
  currencyCode: string;
  line: CartLine;
  onDecrement: () => void;
  onIncrement: () => void;
  onRemove: () => void;
};

export const CartLineItem = ({ currencyCode, line, onDecrement, onIncrement, onRemove }: CartLineItemProps) => (
  <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3">
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-ink">{line.name}</p>
      <p className="text-xs text-ink-faint">
        {formatMoney(line.unitPrice, currencyCode)} × {line.quantity}
      </p>
    </div>

    <QuantityStepper onDecrement={onDecrement} onIncrement={onIncrement} quantity={line.quantity} />

    <p className="w-20 shrink-0 text-right text-sm font-bold text-ink">
      {formatMoney(line.unitPrice * line.quantity, currencyCode)}
    </p>

    <IconButton label={`Remove ${line.name}`} onClick={onRemove} tone="danger">
      <Trash2 size={18} />
    </IconButton>
  </div>
);
