import { ShoppingCart } from 'lucide-react';

export const CartEmptyState = () => (
  <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-ink-faint lg:flex-1">
    <ShoppingCart size={40} />
    <p className="text-sm font-medium">Tap a product to start the sale</p>
  </div>
);
