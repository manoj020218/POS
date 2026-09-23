import { useRef } from 'react';
import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { useCart } from '../../state/use-cart.js';
import { useHeldBills } from '../../state/use-held-bills.js';
import { useProductCatalog } from '../../state/use-product-catalog.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { useScrollDirection } from '../../lib/use-scroll-direction.js';
import { CartPanel } from '../cart/CartPanel.js';
import { HeldBillsStack } from '../payment/HeldBillsStack.js';
import { CatalogPane } from './CatalogPane.js';
import { TopBar } from './TopBar.js';

type KioskShellProps = {
  onTerminalSettingsSaved: () => void;
  terminalSettings: ClientTerminalSettings;
};

export const KioskShell = ({ onTerminalSettingsSaved, terminalSettings }: KioskShellProps) => {
  const cartApi = useCart();
  const catalog = useProductCatalog();
  const heldBillsApi = useHeldBills();
  const { settings } = usePosContext();
  const catalogScrollRef = useRef<HTMLElement | null>(null);
  const topBarHidden = useScrollDirection(catalogScrollRef);

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <div
        className={`shrink-0 overflow-hidden transition-[max-height] duration-200 ${
          topBarHidden ? 'max-h-0' : 'max-h-24'
        }`}
      >
        <TopBar
          onProductSaved={catalog.refresh}
          onTerminalSettingsSaved={onTerminalSettingsSaved}
          terminalSettings={terminalSettings}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <CatalogPane cartApi={cartApi} catalog={catalog} scrollContainerRef={catalogScrollRef} />
        <CartPanel cartApi={cartApi} heldBillsApi={heldBillsApi} terminalSettings={terminalSettings} />
      </div>

      <HeldBillsStack
        currencyCode={settings.currencyCode}
        heldBills={heldBillsApi.heldBills}
        onResume={(bill) => {
          if (
            cartApi.cart.lines.length > 0 &&
            !window.confirm(`Replace the current order with "${bill.label}"? Anything not yet printed will be lost.`)
          ) {
            return;
          }

          cartApi.load(bill.cart);
          heldBillsApi.removeBill(bill.id);
        }}
      />
    </div>
  );
};
