import { useMemo, useState } from 'react';

import { formatMoney } from '../../lib/currency.js';
import { suggestTenderAmounts } from '../../lib/tender-suggestions.js';
import { Button } from '../common/Button.js';
import { NumericKeypad, type NumericKey } from '../common/NumericKeypad.js';
import { QuickAmountChips } from './QuickAmountChips.js';

type CashPaymentPanelProps = {
  currencyCode: string;
  onConfirm: (tenderedAmount: number) => void;
  processing: boolean;
  totalAmount: number;
};

export const CashPaymentPanel = ({ currencyCode, onConfirm, processing, totalAmount }: CashPaymentPanelProps) => {
  const [draft, setDraft] = useState(String(totalAmount));

  const tenderedAmount = Number(draft) || 0;
  const changeAmount = Math.max(0, tenderedAmount - totalAmount);
  const canConfirm = tenderedAmount >= totalAmount;
  const suggestions = useMemo(() => suggestTenderAmounts(totalAmount), [totalAmount]);

  const handleKey = (key: NumericKey) => {
    if (key === 'backspace') {
      setDraft((value) => value.slice(0, -1));
      return;
    }
    if (key === '.' && draft.includes('.')) {
      return;
    }
    setDraft((value) => (value === '0' && key !== '.' ? key : value + key));
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-5xl font-extrabold text-ink">{formatMoney(tenderedAmount, currencyCode)}</p>
      <QuickAmountChips
        amounts={suggestions}
        currencyCode={currencyCode}
        onSelect={(amount) => setDraft(String(amount))}
        selectedAmount={tenderedAmount}
      />
      <NumericKeypad onPress={handleKey} />
      <div className="flex items-center justify-between rounded-xl bg-success-50 px-4 py-3">
        <span className="text-sm font-semibold text-success-600">Change due</span>
        <span className="text-lg font-extrabold text-success-600">{formatMoney(changeAmount, currencyCode)}</span>
      </div>
      <Button
        disabled={!canConfirm || processing}
        fullWidth
        onClick={() => onConfirm(tenderedAmount)}
        size="lg"
        variant="success"
      >
        {processing ? 'Processing…' : 'Confirm cash payment'}
      </Button>
    </div>
  );
};
