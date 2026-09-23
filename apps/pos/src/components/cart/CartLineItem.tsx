import { Trash2 } from 'lucide-react';

import { formatMoney, formatMoneyCompact } from '../../lib/currency.js';
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

// The cart panel's width is a fraction of the screen, not a fixed value --
// a phone-width panel and a large tablet's panel can differ by 2x+. Rather
// than pick one layout for one guessed width, this responds to the panel's
// own rendered width via a container query (@container on the panel in
// CartPanel.tsx): stacked/compact below ~24rem of panel width, a single
// spacious row above it. Two markups, toggled with hidden/@sm:flex, rather
// than one tree contorted to cover both.
export const CartLineItem = ({ currencyCode, line, onDecrement, onIncrement, onRemove }: CartLineItemProps) => {
  const nameLine = (
    <p className="truncate text-sm font-semibold text-ink">
      {line.name}
      {line.variantName && <span className="font-normal text-ink-faint"> · {line.variantName}</span>}
    </p>
  );

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-2 @sm:p-3">
      {/* Compact: name + price share the wide top row (plenty of room there);
          the stepper and remove button -- both fixed-width -- share the row
          below instead of competing with the price for the same space. */}
      <div className="space-y-1 @sm:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
            {line.name}
            {line.variantName && <span className="font-normal text-ink-faint"> · {line.variantName}</span>}
          </p>
          <p className="shrink-0 text-xs font-bold text-ink">
            {formatMoneyCompact(line.unitPrice * line.quantity, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-1.5">
          <QuantityStepper compact onDecrement={onDecrement} onIncrement={onIncrement} quantity={line.quantity} />
          <IconButton label={`Remove ${line.name}`} onClick={onRemove} size="sm" tone="danger">
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      {/* Spacious: everything in one row once there's genuinely room for it. */}
      <div className="hidden items-center gap-3 @sm:flex">
        <div className="min-w-0 flex-1">
          {nameLine}
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
    </div>
  );
};
