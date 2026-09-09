import { Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { useLongPress } from '../../lib/use-long-press.js';
import { useCart } from '../../state/use-cart.js';
import { useKioskOrder } from '../../state/use-kiosk-order.js';
import { useProductCatalog } from '../../state/use-product-catalog.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { CategoryTabs } from '../catalog/CategoryTabs.js';
import { SearchBar } from '../catalog/SearchBar.js';
import { TerminalModeSettingsModal } from '../settings/TerminalModeSettingsModal.js';
import { CustomerProductGrid } from './CustomerProductGrid.js';
import { KioskOrderStatusModal } from './KioskOrderStatusModal.js';
import { SelfServiceKioskOrderPanel } from './SelfServiceKioskOrderPanel.js';

type SelfServiceKioskShellProps = {
  onTerminalSettingsSaved: () => void;
  terminalSettings: ClientTerminalSettings;
};

// Customer-facing screen for a terminal in Self-Service Kiosk mode. Staff
// reach settings via a long-press on the small corner icon (not a plain tap)
// so a curious customer can't stumble into terminal configuration.
export const SelfServiceKioskShell = ({ onTerminalSettingsSaved, terminalSettings }: SelfServiceKioskShellProps) => {
  const { settings } = usePosContext();
  const cartApi = useCart();
  const catalog = useProductCatalog();
  const kioskOrder = useKioskOrder();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const cartQuantities = useMemo(
    () => new Map(cartApi.cart.lines.map((line) => [line.productId, line.quantity])),
    [cartApi.cart.lines]
  );

  const staffAccess = useLongPress(
    () => undefined,
    () => setSettingsOpen(true)
  );

  const handleStatusClose = () => {
    if (kioskOrder.stage.type === 'printed') {
      cartApi.clear();
    }
    kioskOrder.reset();
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <header className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface-raised px-4 lg:px-6">
        <div>
          <p className="text-lg font-bold text-ink">{settings.businessName}</p>
          <p className="text-xs font-medium text-ink-faint">Tap items below to build your order</p>
        </div>
        <button
          aria-label="Staff settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-faint/30"
          onPointerCancel={staffAccess.onPointerCancel}
          onPointerDown={staffAccess.onPointerDown}
          onPointerLeave={staffAccess.onPointerLeave}
          onPointerUp={staffAccess.onPointerUp}
          type="button"
        >
          <Settings size={18} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <section className="flex w-full min-w-0 flex-col gap-3 p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <SearchBar onChange={catalog.setSearchText} value={catalog.searchText} />
          <CategoryTabs
            categories={catalog.categories}
            onSelect={catalog.setCategoryCode}
            selected={catalog.categoryCode}
          />
          <CustomerProductGrid
            cartQuantities={cartQuantities}
            currencyCode={settings.currencyCode}
            onAdd={cartApi.addProduct}
            products={catalog.filteredProducts}
          />
        </section>

        <SelfServiceKioskOrderPanel
          cartApi={cartApi}
          currencyCode={settings.currencyCode}
          onPlaceOrder={() => void kioskOrder.placeOrder(cartApi.cart, terminalSettings.printDualTokens)}
          stage={kioskOrder.stage}
          terminalSettings={terminalSettings}
        />
      </div>

      <KioskOrderStatusModal
        currencyCode={settings.currencyCode}
        onClose={handleStatusClose}
        stage={kioskOrder.stage}
      />

      <TerminalModeSettingsModal
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          setSettingsOpen(false);
          onTerminalSettingsSaved();
        }}
        open={settingsOpen}
        terminalSettings={terminalSettings}
      />
    </div>
  );
};
