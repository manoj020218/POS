import { useEffect, useState } from 'react';
import type { ClientKioskOrderStatus, ClientKioskOrderView } from '@smart-pos/client-data';

import { formatMoney } from '../../lib/currency.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { Modal } from '../common/Modal.js';

const pollIntervalMs = 5000;

const statusCopy: Record<ClientKioskOrderStatus, string> = {
  AWAITING_PAYMENT: 'Awaiting payment',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  FULFILLED: 'Fulfilled',
  UNPAID_TOKEN: 'Pay at counter'
};

const statusTone: Record<ClientKioskOrderStatus, string> = {
  AWAITING_PAYMENT: 'bg-warn-50 text-warn-600',
  CANCELLED: 'bg-danger-50 text-danger-600',
  EXPIRED: 'bg-danger-50 text-danger-600',
  FULFILLED: 'bg-success-50 text-success-600',
  UNPAID_TOKEN: 'bg-brand-50 text-brand-600'
};

type KioskOrderQueueModalProps = {
  onClose: () => void;
  open: boolean;
};

// Business-scoped (not terminal-scoped) — the same kiosk tablet may be the
// only device, so staff can watch this queue from any other authenticated
// session (another tab, another cashier's phone) rather than a dedicated
// second terminal.
export const KioskOrderQueueModal = ({ onClose, open }: KioskOrderQueueModalProps) => {
  const { remoteApi, settings, terminalContext } = usePosContext();
  const [orders, setOrders] = useState<ClientKioskOrderView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await remoteApi.listKioskOrders(terminalContext.businessId);
        if (!cancelled) {
          setOrders(result);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    const interval = setInterval(() => void load(), pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, remoteApi, terminalContext.businessId]);

  if (!open) {
    return null;
  }

  return (
    <Modal onClose={onClose} open={open} title="Kiosk orders" widthClassName="max-w-2xl">
      <div className="space-y-3">
        {orders.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-ink-faint">No active kiosk orders right now.</p>
        )}

        {orders.map((order) => (
          <div className="rounded-2xl border border-line bg-surface-raised p-4" key={order.id}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-extrabold text-ink">{order.tokenNumber}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[order.status]}`}>
                {statusCopy[order.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-faint">
              {order.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ')}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {formatMoney(order.totalAmount, settings.currencyCode)}
            </p>
          </div>
        ))}
      </div>
    </Modal>
  );
};
