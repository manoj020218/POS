import { ScanLine } from 'lucide-react';
import { useState } from 'react';

import { scanBarcode } from '../../lib/barcode-scanner.js';
import type { CartApi } from '../../state/use-cart.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { IconButton } from '../common/IconButton.js';
import { Modal } from '../common/Modal.js';

type KioskTokenLookupModalProps = {
  cartApi: CartApi;
  onClose: () => void;
  onFound: (orderId: string) => void;
  open: boolean;
};

// Lets a counter cashier scan or type a self-service-kiosk token to pre-fill
// the cart at checkout, instead of re-entering the customer's order by hand.
export const KioskTokenLookupModal = ({ cartApi, onClose, onFound, open }: KioskTokenLookupModalProps) => {
  const { remoteApi, store, terminalContext } = usePosContext();
  const [tokenNumber, setTokenNumber] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const applyOrder = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const orders = await remoteApi.listKioskOrders(terminalContext.businessId);
      const match = orders.find(
        (order) => order.tokenNumber.toLowerCase() === trimmed.toLowerCase() && order.status === 'UNPAID_TOKEN'
      );

      if (!match) {
        setError(`No unpaid token found for "${trimmed}"`);
        return;
      }

      const missing: string[] = [];
      for (const item of match.items) {
        const product = await store.products.findById(item.productId);
        if (product) {
          cartApi.addProductWithQuantity(product, item.quantity);
        } else {
          missing.push(item.productName);
        }
      }

      onFound(match.id);

      if (missing.length > 0) {
        setError(`Added, but these items are no longer available: ${missing.join(', ')}`);
        return;
      }

      setTokenNumber('');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not look up this token');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const value = await scanBarcode();
      if (value) {
        setTokenNumber(value);
        await applyOrder(value);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not scan the token');
    } finally {
      setScanning(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Look up kiosk token">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            className="h-12 flex-1 rounded-xl border border-line bg-surface-raised px-4 text-base font-semibold text-ink"
            onChange={(event) => setTokenNumber(event.target.value)}
            placeholder="e.g. K-014"
            value={tokenNumber}
          />
          <IconButton label="Scan token" onClick={() => void handleScan()} tone="brand">
            <ScanLine className={scanning ? 'animate-pulse' : ''} size={20} />
          </IconButton>
        </div>

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        <Button
          disabled={loading || tokenNumber.trim().length === 0}
          fullWidth
          onClick={() => void applyOrder(tokenNumber)}
          size="lg"
          variant="brand"
        >
          {loading ? 'Looking up…' : 'Add token to cart'}
        </Button>
      </div>
    </Modal>
  );
};
