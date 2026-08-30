import { useMemo, useState } from 'react';

import type { CartApi } from '../../state/use-cart.js';
import { useCustomers } from '../../state/use-customers.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { CustomerBar } from '../customer/CustomerBar.js';
import { CustomerPickerModal } from '../customer/CustomerPickerModal.js';
import { DiscountChips } from '../discount/DiscountChips.js';
import { CheckoutFlow } from '../payment/CheckoutFlow.js';
import { CartEmptyState } from './CartEmptyState.js';
import { CartLineItem } from './CartLineItem.js';
import { CartTotals } from './CartTotals.js';

export const CartPanel = ({ cartApi }: { cartApi: CartApi }) => {
  const { settings } = usePosContext();
  const { cart, clear, decrement, increment, remove, setCustomer, setDiscountPercent, totals } = cartApi;
  const customers = useCustomers();
  const [pickerOpen, setPickerOpen] = useState(false);

  const customerName = useMemo(
    () => customers.find((customer) => customer.id === cart.customerId)?.name ?? 'Walk-in Customer',
    [customers, cart.customerId]
  );

  return (
    <aside className="flex w-[26rem] shrink-0 flex-col gap-4 overflow-hidden border-l border-line bg-surface p-4">
      <CustomerBar customerName={customerName} onOpen={() => setPickerOpen(true)} />

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {cart.lines.length === 0 ? (
          <CartEmptyState />
        ) : (
          cart.lines.map((line) => (
            <CartLineItem
              currencyCode={settings.currencyCode}
              key={line.productId}
              line={line}
              onDecrement={() => decrement(line.productId)}
              onIncrement={() => increment(line.productId)}
              onRemove={() => remove(line.productId)}
            />
          ))
        )}
      </div>

      <DiscountChips discountPercent={cart.discountPercent} onChange={setDiscountPercent} />
      <CartTotals currencyCode={settings.currencyCode} totals={totals} />
      <CheckoutFlow
        cart={cart}
        currencyCode={settings.currencyCode}
        onSaleCompleted={clear}
        totalAmount={totals.totalAmount}
      />

      <CustomerPickerModal
        onClose={() => setPickerOpen(false)}
        onSelect={setCustomer}
        open={pickerOpen}
        selectedCustomerId={cart.customerId}
      />
    </aside>
  );
};
