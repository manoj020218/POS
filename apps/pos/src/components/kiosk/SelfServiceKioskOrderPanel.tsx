import { ShoppingBag } from 'lucide-react';
import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { formatMoney } from '../../lib/currency.js';
import type { CartApi } from '../../state/use-cart.js';
import type { KioskOrderStage } from '../../state/use-kiosk-order.js';
import { Button } from '../common/Button.js';
import { CartLineItem } from '../cart/CartLineItem.js';

type SelfServiceKioskOrderPanelProps = {
  cartApi: CartApi;
  currencyCode: string;
  onPlaceOrder: () => void;
  stage: KioskOrderStage;
  terminalSettings: ClientTerminalSettings;
};

export const SelfServiceKioskOrderPanel = ({
  cartApi,
  currencyCode,
  onPlaceOrder,
  stage,
  terminalSettings
}: SelfServiceKioskOrderPanelProps) => {
  const { cart, decrement, increment, remove, totals } = cartApi;
  const busy = stage.type === 'creating' || stage.type === 'awaitingPayment';

  return (
    <aside className="flex w-full flex-col gap-4 border-t border-line bg-surface p-4 lg:w-[26rem] lg:shrink-0 lg:overflow-hidden lg:border-l lg:border-t-0">
      <div>
        <p className="text-lg font-bold text-ink">Your order</p>
        <p className="text-xs text-ink-faint">Tap items to add them, then place your order below.</p>
      </div>

      <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {cart.lines.length === 0 ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-ink-faint lg:flex-1">
            <ShoppingBag size={40} />
            <p className="text-sm font-medium">Tap an item to start your order</p>
          </div>
        ) : (
          cart.lines.map((line) => (
            <CartLineItem
              currencyCode={currencyCode}
              key={line.productId}
              line={line}
              onDecrement={() => decrement(line.productId)}
              onIncrement={() => increment(line.productId)}
              onRemove={() => remove(line.productId)}
            />
          ))
        )}
      </div>

      <div className="space-y-1.5 rounded-2xl bg-surface-sunken p-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-ink">Total</span>
          <span className="text-2xl font-extrabold text-ink">{formatMoney(totals.totalAmount, currencyCode)}</span>
        </div>
      </div>

      <Button disabled={cart.lines.length === 0 || busy} fullWidth onClick={onPlaceOrder} size="lg" variant="brand">
        {terminalSettings.kioskCollectsPayment
          ? `Pay ${formatMoney(totals.totalAmount, currencyCode)}`
          : 'Print my token'}
      </Button>
    </aside>
  );
};
