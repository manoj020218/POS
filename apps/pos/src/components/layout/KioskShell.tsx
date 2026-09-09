import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { useCart } from '../../state/use-cart.js';
import { useProductCatalog } from '../../state/use-product-catalog.js';
import { CartPanel } from '../cart/CartPanel.js';
import { CatalogPane } from './CatalogPane.js';
import { TopBar } from './TopBar.js';

type KioskShellProps = {
  onTerminalSettingsSaved: () => void;
  terminalSettings: ClientTerminalSettings;
};

export const KioskShell = ({ onTerminalSettingsSaved, terminalSettings }: KioskShellProps) => {
  const cartApi = useCart();
  const catalog = useProductCatalog();

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <TopBar
        onProductSaved={catalog.refresh}
        onTerminalSettingsSaved={onTerminalSettingsSaved}
        terminalSettings={terminalSettings}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <CatalogPane cartApi={cartApi} catalog={catalog} />
        <CartPanel cartApi={cartApi} />
      </div>
    </div>
  );
};
