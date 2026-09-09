import type { ClientProductRecord } from '@smart-pos/client-data';

import { formatMoneyCompact } from '../../lib/currency.js';

const avatarPalette = [
  'bg-brand-50 text-brand-600',
  'bg-success-50 text-success-600',
  'bg-warn-50 text-warn-600',
  'bg-danger-50 text-danger-600'
];

const paletteFor = (seed: string) => {
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarPalette[hash % avatarPalette.length];
};

type CustomerProductCardProps = {
  currencyCode: string;
  onAdd: () => void;
  product: ClientProductRecord;
  quantityInCart: number;
};

// Customer-facing: tap only adds to cart — no price-edit or long-press, since
// customers should never be able to reach product editing.
export const CustomerProductCard = ({ currencyCode, onAdd, product, quantityInCart }: CustomerProductCardProps) => (
  <button
    className="relative flex h-44 flex-col justify-between rounded-2xl border border-line bg-surface-raised p-4 text-left shadow-kiosk transition-transform active:scale-[0.97] active:bg-surface-sunken"
    onClick={onAdd}
    type="button"
  >
    {quantityInCart > 0 && (
      <span className="absolute -right-2 -top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-500 px-1.5 text-sm font-bold text-white shadow-kiosk">
        {quantityInCart}
      </span>
    )}

    {product.imageUrl ? (
      <img alt="" className="h-14 w-14 rounded-xl object-cover" src={product.imageUrl} />
    ) : (
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold ${paletteFor(product.categoryCode)}`}
      >
        {product.name.slice(0, 1).toUpperCase()}
      </div>
    )}

    <div>
      <p className="line-clamp-2 text-base font-semibold leading-snug text-ink">{product.name}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{product.unitSymbol ?? product.unitName}</p>
    </div>

    <p className="text-xl font-extrabold text-ink">{formatMoneyCompact(product.sellingPrice, currencyCode)}</p>
  </button>
);
