import type { ClientProductRecord } from '@smart-pos/client-data';

import { formatMoneyCompact } from '../../lib/currency.js';
import { useLongPress } from '../../lib/use-long-press.js';

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
  onEditPrice: () => void;
  onEditProduct: () => void;
  product: ClientProductRecord;
  quantityInCart: number;
  quantityOnHand?: number;
};

export const ProductCard = ({
  currencyCode,
  onAdd,
  onEditPrice,
  onEditProduct,
  product,
  quantityInCart,
  quantityOnHand
}: ProductCardProps) => {
  const lowStock =
    product.trackInventory && quantityOnHand !== undefined && quantityOnHand <= product.lowStockLevel;
  // Plain tap adds to cart (unchanged checkout behavior); long-press opens the
  // full edit form. The price itself is a separate nested tap target (below)
  // for the fast price-only edit, stopping propagation so it never also
  // triggers add-to-cart or the long-press timer.
  const longPress = useLongPress(onAdd, onEditProduct);

  return (
    <div
      className="relative flex h-40 flex-col justify-between rounded-2xl border border-line bg-surface-raised p-4 text-left shadow-kiosk transition-transform active:scale-[0.97] active:bg-surface-sunken"
      onPointerCancel={longPress.onPointerCancel}
      onPointerDown={longPress.onPointerDown}
      onPointerLeave={longPress.onPointerLeave}
      onPointerUp={longPress.onPointerUp}
      role="button"
      tabIndex={0}
    >
      {quantityInCart > 0 && (
        <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white shadow-kiosk">
          {quantityInCart}
        </span>
      )}

      <div className="flex items-start justify-between">
        {product.imageUrl ? (
          <img
            alt=""
            className="h-10 w-10 rounded-xl object-cover"
            onPointerDown={(event) => event.stopPropagation()}
            src={product.imageUrl}
          />
        ) : (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${paletteFor(product.categoryCode)}`}
          >
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
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

      <button
        className="w-fit text-lg font-extrabold text-ink underline decoration-dotted decoration-2 underline-offset-4"
        onClick={(event) => {
          event.stopPropagation();
          onEditPrice();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        {formatMoneyCompact(product.sellingPrice, currencyCode)}
      </button>
    </div>
  );
};
