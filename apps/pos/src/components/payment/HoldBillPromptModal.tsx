import { useEffect, useState } from 'react';

import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type HoldBillPromptModalProps = {
  onClose: () => void;
  onConfirm: (label: string) => void;
  open: boolean;
};

export const HoldBillPromptModal = ({ onClose, onConfirm, open }: HoldBillPromptModalProps) => {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (open) {
      setLabel('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const trimmed = label.trim();

  const confirm = () => {
    if (trimmed.length === 0) {
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal onClose={onClose} open={open} title="Who is this bill for?" widthClassName="max-w-sm">
      <div className="space-y-4">
        <p className="text-xs text-ink-faint">
          A table number or customer name so you can find this bill again once they pay -- e.g. "Table 3".
        </p>

        <input
          autoFocus
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base font-semibold text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              confirm();
            }
          }}
          placeholder="Table 3"
          value={label}
        />

        <Button disabled={trimmed.length === 0} fullWidth onClick={confirm} variant="brand">
          Print bill
        </Button>
      </div>
    </Modal>
  );
};
