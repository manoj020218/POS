import { useCart } from '../../state/use-cart.js';
import { CartPanel } from '../cart/CartPanel.js';
import { CatalogPane } from './CatalogPane.js';
import { TopBar } from './TopBar.js';

export const KioskShell = () => {
  const cartApi = useCart();

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <TopBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CatalogPane cartApi={cartApi} />
        <CartPanel cartApi={cartApi} />
      </div>
    </div>
  );
};
