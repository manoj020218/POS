import { useState } from 'react';

import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { NumericKeypad, type NumericKey } from '../common/NumericKeypad.js';

const quickPercents = [0, 5, 10, 15];

type DiscountChipsProps = {
  discountPercent: number;
  onChange: (percent: number) => void;
};

export const DiscountChips = ({ discountPercent, onChange }: DiscountChipsProps) => {
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const isCustomActive = customOpen === false && !quickPercents.includes(discountPercent);

  const handleKey = (key: NumericKey) => {
    if (key === 'backspace') {
      setDraft((value) => value.slice(0, -1));
      return;
    }
    if (key === 'clear') {
      setDraft('');
      return;
    }
    if (draft.length >= 3) {
      return;
    }
    setDraft((value) => value + key);
  };

  const confirmCustom = () => {
    const percent = Math.min(100, Math.max(0, Number(draft) || 0));
    onChange(percent);
    setCustomOpen(false);
    setDraft('');
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Discount</span>
      {quickPercents.map((percent) => (
        <button
          className={`h-9 rounded-lg px-3 text-sm font-bold transition-colors ${
            discountPercent === percent
              ? 'bg-warn-500 text-white'
              : 'bg-surface-sunken text-ink-muted active:bg-line'
          }`}
          key={percent}
          onClick={() => onChange(percent)}
          type="button"
        >
          {percent}%
        </button>
      ))}
      <button
        className={`h-9 rounded-lg px-3 text-sm font-bold transition-colors ${
          isCustomActive ? 'bg-warn-500 text-white' : 'bg-surface-sunken text-ink-muted active:bg-line'
        }`}
        onClick={() => setCustomOpen(true)}
        type="button"
      >
        {isCustomActive ? `${discountPercent}%` : 'Custom'}
      </button>

      <Modal onClose={() => setCustomOpen(false)} open={customOpen} title="Custom discount %" widthClassName="max-w-sm">
        <div className="space-y-4">
          <p className="text-center text-4xl font-extrabold text-ink">{draft || '0'}%</p>
          <NumericKeypad allowDecimal={false} onPress={handleKey} />
          <Button fullWidth onClick={confirmCustom} size="lg" variant="brand">
            Apply
          </Button>
        </div>
      </Modal>
    </div>
  );
};
