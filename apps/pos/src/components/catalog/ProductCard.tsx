import type { ClientProductRecord, ClientProductVariant } from '@smart-pos/client-data';

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
  onAdd: (variant?: ClientProductVariant) => void;
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
  const hasVariants = product.variants.length > 0;
  const lowStock =
    product.trackInventory && quantityOnHand !== undefined && quantityOnHand <= product.lowStockLevel;
  // Plain tap adds to cart (unchanged checkout behavior); long-press opens the
  // full edit form. When the product has variants there's no single default
  // price to add at, so a tap on the card itself (outside a variant button)
  // does nothing -- the cashier picks Half/Full explicitly below.
  const longPress = useLongPress(hasVariants ? () => undefined : () => onAdd(), onEditProduct);
  // Price is a separate nested long-press target (a quick tap here does
  // nothing) so a fast cashier brushing past the price during normal
  // checkout use never accidentally opens the price-change screen.
  const priceLongPress = useLongPress(() => undefined, onEditPrice);

  return (
    <div
      className="relative mx-auto flex h-28 w-[90%] flex-col overflow-hidden rounded-2xl border border-line bg-surface-sunken text-left shadow-kiosk transition-transform active:scale-[0.97]"
      onPointerCancel={longPress.onPointerCancel}
      onPointerDown={longPress.onPointerDown}
      onPointerLeave={longPress.onPointerLeave}
      onPointerUp={longPress.onPointerUp}
      role="button"
      tabIndex={0}
    >
      <div className="absolute inset-0">
        {product.imageUrl ? (
          <img
            alt=""
            className="h-full w-full object-cover"
            onPointerDown={(event) => event.stopPropagation()}
            src={product.imageUrl}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center text-2xl font-bold ${paletteFor(product.categoryCode)}`}
          >
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {quantityInCart > 0 && (
        <span className="absolute -right-2 -top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white shadow-kiosk">
          {quantityInCart}
        </span>
      )}

      <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
        {product.foodType && (
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-sm border-2 bg-white shadow-kiosk ${
              product.foodType === 'veg' ? 'border-success-500' : 'border-danger-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                product.foodType === 'veg' ? 'bg-success-500' : 'bg-danger-500'
              }`}
            />
          </span>
        )}
        {lowStock && (
          <span className="rounded-full bg-warn-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn-600 shadow-kiosk">
            Low
          </span>
        )}
      </div>

      <div className="relative z-10 mt-auto bg-white/35 px-2 py-1.5 backdrop-blur-md">
        {hasVariants ? (
          <div className="flex flex-col gap-1">
            <p className="truncate text-xs font-semibold leading-tight text-ink">{product.name}</p>
            <div className="flex flex-wrap gap-1">
              {product.variants.map((variant) => (
                <button
                  className="rounded-lg border border-brand-500/30 bg-brand-500/20 px-2 py-1 text-[11px] font-bold text-brand-700 backdrop-blur-sm active:bg-brand-500/30"
                  key={variant.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAdd(variant);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  {variant.name} {formatMoneyCompact(variant.sellingPrice, currencyCode)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold leading-tight text-ink">{product.name}</p>
              <p className="truncate text-[10px] text-ink-faint">
                {product.sku} · {product.unitSymbol ?? product.unitName}
              </p>
            </div>
            <button
              className="shrink-0 text-sm font-extrabold text-ink underline decoration-dotted decoration-2 underline-offset-2"
              onPointerCancel={priceLongPress.onPointerCancel}
              onPointerDown={(event) => {
                event.stopPropagation();
                priceLongPress.onPointerDown(event);
              }}
              onPointerLeave={priceLongPress.onPointerLeave}
              onPointerUp={(event) => {
                event.stopPropagation();
                priceLongPress.onPointerUp(event);
              }}
              type="button"
            >
              {formatMoneyCompact(product.sellingPrice, currencyCode)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
