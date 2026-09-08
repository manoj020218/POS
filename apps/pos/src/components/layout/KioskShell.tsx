import { useCart } from '../../state/use-cart.js';
import { useProductCatalog } from '../../state/use-product-catalog.js';
import { CartPanel } from '../cart/CartPanel.js';
import { CatalogPane } from './CatalogPane.js';
import { TopBar } from './TopBar.js';

export const KioskShell = () => {
  const cartApi = useCart();
  const catalog = useProductCatalog();

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <TopBar onProductSaved={catalog.refresh} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <CatalogPane cartApi={cartApi} catalog={catalog} />
        <CartPanel cartApi={cartApi} />
      </div>
    </div>
  );
};
