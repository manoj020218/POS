import { useEffect, useState } from 'react';

import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type EditNameModalProps = {
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  open: boolean;
};

export const EditNameModal = ({ currentName, onClose, onSave, open }: EditNameModalProps) => {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
    }
  }, [open, currentName]);

  if (!open) {
    return null;
  }

  const trimmed = name.trim();

  const save = async () => {
    if (trimmed.length === 0) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Edit your name" widthClassName="max-w-sm">
      <div className="space-y-4">
        <p className="text-xs text-ink-faint">Shown in the top bar and on receipts as the cashier for each sale.</p>

        <input
          autoFocus
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base font-semibold text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void save();
            }
          }}
          value={name}
        />

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        <Button disabled={trimmed.length === 0 || saving} fullWidth onClick={() => void save()} variant="brand">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
};
