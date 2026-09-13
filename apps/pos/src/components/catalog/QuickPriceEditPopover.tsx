import { useEffect, useState } from 'react';
import type { ClientProductRecord, ClientRemoteProductPriceChange } from '@smart-pos/client-data';

import { formatMoney, formatMoneyCompact } from '../../lib/currency.js';
import { toClientProductRecord } from '../../lib/product-view-mapping.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { NumericKeypad, type NumericKey } from '../common/NumericKeypad.js';

type QuickPriceEditPopoverProps = {
  onClose: () => void;
  onSaved: (updated: ClientProductRecord) => void;
  product: ClientProductRecord;
};

export const QuickPriceEditPopover = ({ onClose, onSaved, product }: QuickPriceEditPopoverProps) => {
  const { remoteApi, settings, store } = usePosContext();
  const [draft, setDraft] = useState(String(product.sellingPrice));
  const [history, setHistory] = useState<ClientRemoteProductPriceChange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    remoteApi
      .getProductPriceHistory(product.id)
      .then((result) => {
        if (!cancelled) {
          setHistory(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [remoteApi, product.id]);

  const handleKey = (key: NumericKey) => {
    if (key === 'backspace') {
      setDraft((value) => value.slice(0, -1));
      return;
    }
    if (key === 'clear') {
      setDraft('');
      return;
    }
    if (key === '.' && draft.includes('.')) {
      return;
    }
    setDraft((value) => (value === '0' && key !== '.' ? key : value + key));
  };

  const newPrice = Number(draft) || 0;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await remoteApi.updateProduct(product.id, { sellingPrice: newPrice });
      const clientRecord = toClientProductRecord(updated);
      await store.products.upsertProducts([clientRecord]);
      onSaved(clientRecord);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the price');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} open title={product.name} widthClassName="max-w-sm">
      <div className="space-y-4">
        <p className="text-center text-4xl font-extrabold text-ink">
          {formatMoney(newPrice, settings.currencyCode)}
        </p>

        {history.length > 0 && (
          <div className="space-y-1.5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Recent prices</p>
            <div className="flex flex-wrap justify-center gap-2">
              {history.map((entry) => (
                <span
                  className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-semibold text-ink-faint"
                  key={entry.changedAt}
                >
                  {formatMoneyCompact(entry.previousPrice, settings.currencyCode)}
                </span>
              ))}
            </div>
          </div>
        )}

        <NumericKeypad onPress={handleKey} />

        {error && (
          <p className="rounded-xl bg-danger-50 px-4 py-3 text-center text-sm font-semibold text-danger-600">
            {error}
          </p>
        )}

        <Button disabled={saving || newPrice <= 0} fullWidth onClick={() => void handleSave()} size="lg" variant="brand">
          {saving ? 'Saving…' : 'Save price'}
        </Button>
      </div>
    </Modal>
  );
};
