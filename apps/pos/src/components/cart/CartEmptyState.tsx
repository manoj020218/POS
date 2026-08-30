import { ShoppingCart } from 'lucide-react';

export const CartEmptyState = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ink-faint">
    <ShoppingCart size={40} />
    <p className="text-sm font-medium">Tap a product to start the sale</p>
  </div>
);
