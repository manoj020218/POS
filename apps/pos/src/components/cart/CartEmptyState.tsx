import { ShoppingCart } from 'lucide-react';

export const CartEmptyState = () => (
  <div className="flex h-32 shrink-0 flex-col items-center justify-center gap-2 text-ink-faint">
    <ShoppingCart size={32} />
    <p className="text-xs font-medium">Tap a product to start the sale</p>
  </div>
);
