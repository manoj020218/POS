import { Delete } from 'lucide-react';

import { useCalculator } from '../../state/use-calculator.js';
import { Modal } from '../common/Modal.js';
import { CalculatorKey } from './CalculatorKey.js';

type CalculatorModalProps = {
  onClose: () => void;
  open: boolean;
};

export const CalculatorModal = ({ onClose, open }: CalculatorModalProps) => {
  const { backspace, clear, display, equals, expression, inputDecimal, inputDigit, setOperator } = useCalculator();

  return (
    <Modal onClose={onClose} open={open} title="Calculator" widthClassName="max-w-sm">
      <div className="space-y-4">
        <div className="space-y-1 rounded-2xl bg-surface-sunken px-4 py-3">
          <p className="truncate text-right text-sm font-semibold text-ink-faint">{expression || ' '}</p>
          <p className="truncate text-right text-4xl font-extrabold text-ink">{display}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <CalculatorKey onPress={clear} tone="operator">
            C
          </CalculatorKey>
          <CalculatorKey onPress={backspace} tone="operator">
            <Delete size={20} className="mx-auto" />
          </CalculatorKey>
          <CalculatorKey onPress={() => setOperator('÷')} tone="operator">
            ÷
          </CalculatorKey>
          <CalculatorKey onPress={() => setOperator('×')} tone="operator">
            ×
          </CalculatorKey>

          {(['7', '8', '9'] as const).map((digit) => (
            <CalculatorKey key={digit} onPress={() => inputDigit(digit)}>
              {digit}
            </CalculatorKey>
          ))}
          <CalculatorKey onPress={() => setOperator('-')} tone="operator">
            −
          </CalculatorKey>

          {(['4', '5', '6'] as const).map((digit) => (
            <CalculatorKey key={digit} onPress={() => inputDigit(digit)}>
              {digit}
            </CalculatorKey>
          ))}
          <CalculatorKey onPress={() => setOperator('+')} tone="operator">
            +
          </CalculatorKey>

          {(['1', '2', '3'] as const).map((digit) => (
            <CalculatorKey key={digit} onPress={() => inputDigit(digit)}>
              {digit}
            </CalculatorKey>
          ))}
          <CalculatorKey className="row-span-2" onPress={equals} tone="accent">
            =
          </CalculatorKey>

          <CalculatorKey className="col-span-2" onPress={() => inputDigit('0')}>
            0
          </CalculatorKey>
          <CalculatorKey onPress={inputDecimal}>.</CalculatorKey>
        </div>
      </div>
    </Modal>
  );
};
