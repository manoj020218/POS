import { useEffect, useState } from 'react';

import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type ReceiptMessageSettingsModalProps = {
  onClose: () => void;
  open: boolean;
};

const maxLength = 500;

export const ReceiptMessageSettingsModal = ({ onClose, open }: ReceiptMessageSettingsModalProps) => {
  const { refreshSettings, remoteApi, settings } = usePosContext();
  const [message, setMessage] = useState(settings.receiptFooter ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMessage(settings.receiptFooter ?? '');
      setError(null);
    }
  }, [open, settings.receiptFooter]);

  if (!open) {
    return null;
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const trimmed = message.trim();
      await remoteApi.updateBusinessSettings({ receiptFooter: trimmed.length > 0 ? trimmed : null });
      await refreshSettings();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the receipt message');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Receipt message" widthClassName="max-w-lg">
      <div className="space-y-4">
        <p className="text-xs text-ink-faint">
          Printed at the bottom of every receipt, below the totals -- e.g. "Thanks, visit again!". Leave
          blank to print no footer message.
        </p>

        <textarea
          className="h-28 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
          maxLength={maxLength}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Thanks, visit again!"
          value={message}
        />
        <p className="text-right text-xs text-ink-faint">
          {message.length}/{maxLength}
        </p>

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        <Button disabled={saving} fullWidth onClick={() => void save()} variant="brand">
          {saving ? 'Saving…' : 'Save receipt message'}
        </Button>
      </div>
    </Modal>
  );
};
