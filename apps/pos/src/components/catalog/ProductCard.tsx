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

type ProductCardProps = {
  currencyCode: string;
  onAdd: () => void;
  product: ClientProductRecord;
  quantityInCart: number;
  quantityOnHand?: number;
};

export const ProductCard = ({ currencyCode, onAdd, product, quantityInCart, quantityOnHand }: ProductCardProps) => {
  const lowStock =
    product.trackInventory && quantityOnHand !== undefined && quantityOnHand <= product.lowStockLevel;

  return (
    <button
      className="relative flex h-40 flex-col justify-between rounded-2xl border border-line bg-surface-raised p-4 text-left shadow-kiosk transition-transform active:scale-[0.97] active:bg-surface-sunken"
      onClick={onAdd}
      type="button"
    >
      {quantityInCart > 0 && (
        <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white shadow-kiosk">
          {quantityInCart}
        </span>
      )}

      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${paletteFor(product.categoryCode)}`}>
          {product.name.slice(0, 1).toUpperCase()}
        </div>
        {lowStock && (
          <span className="rounded-full bg-warn-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn-600">
            Low stock
          </span>
        )}
      </div>

      <div>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{product.name}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {product.sku} · {product.unitSymbol ?? product.unitName}
        </p>
      </div>

      <p className="text-lg font-extrabold text-ink">{formatMoneyCompact(product.sellingPrice, currencyCode)}</p>
    </button>
  );
};
