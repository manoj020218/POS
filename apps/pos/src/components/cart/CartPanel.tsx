import { Ticket } from 'lucide-react';
import { useMemo, useState } from 'react';

import { KioskTokenLookupModal } from '../kiosk/KioskTokenLookupModal.js';
import type { CartApi } from '../../state/use-cart.js';
import { useCustomers } from '../../state/use-customers.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { CustomerBar } from '../customer/CustomerBar.js';
import { CustomerPickerModal } from '../customer/CustomerPickerModal.js';
import { DiscountChips } from '../discount/DiscountChips.js';
import { IconButton } from '../common/IconButton.js';
import { CheckoutFlow } from '../payment/CheckoutFlow.js';
import { CartEmptyState } from './CartEmptyState.js';
import { CartLineItem } from './CartLineItem.js';
import { CartTotals } from './CartTotals.js';

export const CartPanel = ({ cartApi }: { cartApi: CartApi }) => {
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
    <aside className="flex w-full flex-col gap-4 border-t border-line bg-surface p-4 lg:w-[26rem] lg:shrink-0 lg:overflow-hidden lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <CustomerBar customerName={customerName} onOpen={() => setPickerOpen(true)} />
        </div>
        <IconButton label="Look up kiosk token" onClick={() => setTokenLookupOpen(true)} tone="neutral">
          <Ticket size={20} />
        </IconButton>
      </div>

      <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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
