import { Ticket } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { KioskTokenLookupModal } from '../kiosk/KioskTokenLookupModal.js';
import type { CartApi } from '../../state/use-cart.js';
import { useCustomers } from '../../state/use-customers.js';
import type { HeldBillsApi } from '../../state/use-held-bills.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { CustomerBar } from '../customer/CustomerBar.js';
import { CustomerPickerModal } from '../customer/CustomerPickerModal.js';
import { DiscountChips } from '../discount/DiscountChips.js';
import { IconButton } from '../common/IconButton.js';
import { CheckoutFlow } from '../payment/CheckoutFlow.js';
import { CartEmptyState } from './CartEmptyState.js';
import { CartLineItem } from './CartLineItem.js';
import { CartTotals } from './CartTotals.js';

type CartPanelProps = {
  cartApi: CartApi;
  heldBillsApi: HeldBillsApi;
  terminalSettings: ClientTerminalSettings;
};

export const CartPanel = ({ cartApi, heldBillsApi, terminalSettings }: CartPanelProps) => {
  const { remoteApi, settings } = usePosContext();
  const { cart, clear, decrement, increment, remove, setCustomer, setDiscountPercent, totals } = cartApi;
  const customers = useCustomers();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tokenLookupOpen, setTokenLookupOpen] = useState(false);
  const [kioskOrderId, setKioskOrderId] = useState<string | null>(null);

  const customerName = useMemo(
    () => customers.find((customer) => customer.id === cart.customerId)?.name ?? 'Walk-in Customer',
    [customers, cart.customerId]
  );

  return (
    <aside className="@container flex w-[30%] shrink-0 flex-col gap-4 overflow-hidden border-l border-line bg-surface p-4">
      {terminalSettings.showWalkInCustomer && (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <CustomerBar customerName={customerName} onOpen={() => setPickerOpen(true)} />
          </div>
          <IconButton label="Look up kiosk token" onClick={() => setTokenLookupOpen(true)} size="sm" tone="neutral">
            <Ticket size={18} />
          </IconButton>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto">
        {cart.lines.length === 0 ? (
          <CartEmptyState />
        ) : (
          cart.lines.map((line) => (
            <CartLineItem
              currencyCode={settings.currencyCode}
              key={`${line.productId}:${line.variantId ?? ''}`}
              line={line}
              onDecrement={() => decrement(line.productId, line.variantId)}
              onIncrement={() => increment(line.productId, line.variantId)}
              onRemove={() => remove(line.productId, line.variantId)}
            />
          ))
        )}
      </div>

      <DiscountChips discountPercent={cart.discountPercent} onChange={setDiscountPercent} />
      <CartTotals currencyCode={settings.currencyCode} totals={totals} />
      <CheckoutFlow
        cart={cart}
        currencyCode={settings.currencyCode}
        onHoldBill={(label, heldCart, totalAmount) => {
          heldBillsApi.holdBill(label, heldCart, totalAmount);
          clear();
          setKioskOrderId(null);
        }}
        onSaleCompleted={() => {
          clear();
          setKioskOrderId(null);
        }}
        onSaleRecorded={(saleId) => {
          if (kioskOrderId) {
            void remoteApi.fulfillKioskOrder(kioskOrderId, saleId).catch(() => undefined);
          }
        }}
        totalAmount={totals.totalAmount}
      />

      <CustomerPickerModal
        onClose={() => setPickerOpen(false)}
        onSelect={setCustomer}
        open={pickerOpen}
        selectedCustomerId={cart.customerId}
      />

      <KioskTokenLookupModal
        cartApi={cartApi}
        onClose={() => setTokenLookupOpen(false)}
        onFound={setKioskOrderId}
        open={tokenLookupOpen}
      />
    </aside>
  );
};
